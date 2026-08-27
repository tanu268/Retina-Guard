'use strict';
const { deterministicKey } = require('../utils/ids');
const { nowIso } = require('../utils/time');
const logger = require('../utils/logger');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SyncManager — store-and-forward replication from edge (SQLite) to district
 * (PostgreSQL).
 *
 * Design rules taken from Blueprint §08:
 *   · inference and screening never wait for the network
 *   · every queued change carries a deterministic idempotency key
 *   · local rows are retained until the district ACKs them
 *   · conflicts are surfaced, never silently resolved in favour of one side
 *   · retries use exponential backoff with jitter and a hard attempt ceiling
 * ═══════════════════════════════════════════════════════════════════════════
 */
class SyncManager {
  constructor({ syncQueueRepository, districtDb, config, eventBus }) {
    this.queue = syncQueueRepository;
    this.districtDb = districtDb || null;
    this.config = config;
    this.eventBus = eventBus;
    this.running = false;
    this.timer = null;
    this.lastRun = null;
  }

  get online() { return Boolean(this.districtDb); }

  // ── enqueue ──────────────────────────────────────────────────────────────

  /**
   * Adds a change to the outbox. The idempotency key is derived from
   * (entity, id, operation, version) so a retry after a power cut maps to the
   * same key rather than duplicating the row on the district node.
   */
  async enqueue({ entityType, entityId, operation, payload, version = 1 }, executor) {
    const key = deterministicKey(this.config.node.siteId, entityType, entityId, operation, version);
    return this.queue.enqueue({
      entity_type: entityType,
      entity_id: entityId,
      operation,
      payload,
      entity_version: version,
      idempotency_key: key,
      max_attempts: this.config.sync.maxAttempts,
    }, executor);
  }

  // ── push ─────────────────────────────────────────────────────────────────

  async push({ batchSize } = {}) {
    if (!this.online) {
      return { pushed: 0, failed: 0, conflicts: 0, skipped: true, reason: 'district_node_not_configured' };
    }
    // Recover anything abandoned mid-flight by a crash or power loss.
    await this.queue.requeueStale(new Date(Date.now() - 5 * 60000).toISOString());

    const items = await this.queue.claimBatch(batchSize || this.config.sync.batchSize);
    let pushed = 0; let failed = 0; let conflicts = 0;

    for (const item of items) {
      try {
        const outcome = await this.#applyToDistrict(item);
        if (outcome.result === 'conflict') {
          conflicts += 1;
          await this.queue.markConflict(item.id, outcome.detail);
          this.eventBus?.emit?.('sync_conflict', { entityType: item.entity_type, entityId: item.entity_id });
        } else {
          pushed += 1;
          await this.queue.markSynced(item.id);
        }
      } catch (err) {
        failed += 1;
        logger.warn({ err: err.message, item: item.id }, 'Sync push failed; will retry');
        await this.queue.markFailed(item.id, err.message, this.config.sync.baseBackoffMs);
      }
    }

    this.lastRun = nowIso();
    const summary = { pushed, failed, conflicts, batch: items.length, at: this.lastRun };
    if (items.length) this.eventBus?.emit?.('sync_finished', summary);
    return summary;
  }

  /**
   * Applies one outbox item inside a district transaction.
   * The receipt ledger makes a replayed push a no-op instead of a duplicate.
   */
  async #applyToDistrict(item) {
    return this.districtDb.transaction(async (tx) => {
      const existing = await tx.get(
        'SELECT result FROM sync_receipts WHERE idempotency_key = ?', [item.idempotency_key],
      );
      if (existing) return { result: 'duplicate' };

      const payload = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload;
      const table = SyncManager.TABLE_FOR[item.entity_type];
      if (!table) throw new Error(`No district table mapped for ${item.entity_type}`);

      // Last-writer-wins is refused for clinical rows: a lower version arriving
      // after a higher one is a genuine conflict a human must look at.
      const current = await tx.get(`SELECT version FROM ${table} WHERE id = ?`, [payload.id])
        .catch(() => null);
      if (current && current.version !== undefined && Number(current.version) > Number(item.entity_version)) {
        await tx.run(
          `INSERT INTO sync_receipts (idempotency_key, site_id, entity_type, entity_id, operation, entity_version, result, detail)
           VALUES (?, ?, ?, ?, ?, ?, 'conflict', ?)`,
          [item.idempotency_key, this.config.node.siteId, item.entity_type, payload.id,
            item.operation, item.entity_version, `district version ${current.version} > edge ${item.entity_version}`],
        );
        return { result: 'conflict', detail: `District holds newer version ${current.version}` };
      }

      await this.#upsert(tx, table, payload);
      await tx.run(
        `INSERT INTO sync_receipts (idempotency_key, site_id, entity_type, entity_id, operation, entity_version, result)
         VALUES (?, ?, ?, ?, ?, ?, 'applied')`,
        [item.idempotency_key, this.config.node.siteId, item.entity_type, payload.id,
          item.operation, item.entity_version],
      );
      return { result: 'applied' };
    });
  }

  async #upsert(tx, table, payload) {
    const row = { ...payload };
    delete row.sync_state;
    const cols = Object.keys(row).filter((k) => row[k] !== undefined);
    const placeholders = cols.map(() => '?').join(', ');
    const updates = cols.filter((c) => c !== 'id').map((c) => `${c} = EXCLUDED.${c}`).join(', ');
    const values = cols.map((c) => (typeof row[c] === 'object' && row[c] !== null ? JSON.stringify(row[c]) : row[c]));
    await tx.run(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})
       ON CONFLICT (id) DO UPDATE SET ${updates || 'id = EXCLUDED.id'}`,
      values,
    );
  }

  // ── pull ─────────────────────────────────────────────────────────────────

  /**
   * Pulls district-side changes the edge node needs: reviewer decisions made at
   * the district, and reference data. Reviews are the important case — a doctor
   * may adjudicate remotely while the PHC is offline.
   */
  async pull({ since, limit = 100 } = {}) {
    if (!this.online) return { pulled: 0, skipped: true, reason: 'district_node_not_configured' };
    const cutoff = since || new Date(Date.now() - 7 * 86400000).toISOString();
    const rows = await this.districtDb.all(
      `SELECT * FROM reviews WHERE updated_at > ? ORDER BY updated_at ASC LIMIT ?`,
      [cutoff, limit],
    );
    this.lastRun = nowIso();
    return { pulled: rows.length, items: rows, since: cutoff, at: this.lastRun };
  }

  // ── status & scheduling ──────────────────────────────────────────────────

  async status() {
    const summary = await this.queue.summary();
    return {
      districtConfigured: this.online,
      siteId: this.config.node.siteId,
      lastRunAt: this.lastRun,
      schedulerRunning: this.running,
      intervalMs: this.config.sync.intervalMs,
      queue: summary,
      health: (summary.byStatus.failed || 0) > 0 ? 'degraded'
        : (summary.byStatus.conflict || 0) > 0 ? 'attention_required' : 'ok',
    };
  }

  start() {
    if (this.running || this.config.isTest) return;
    this.running = true;
    this.timer = setInterval(() => {
      this.push().catch((err) => logger.error({ err: err.message }, 'Scheduled sync failed'));
    }, this.config.sync.intervalMs);
    this.timer.unref?.();
    logger.info({ intervalMs: this.config.sync.intervalMs }, 'Sync scheduler started');
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
  }
}

SyncManager.TABLE_FOR = Object.freeze({
  patient: 'patients',
  consultation: 'consultations',
  image: 'images',
  analysis_result: 'analysis_results',
  explainability: 'explainability',
  review: 'reviews',
  report: 'reports',
  audit_log: 'audit_logs',
});

module.exports = SyncManager;
