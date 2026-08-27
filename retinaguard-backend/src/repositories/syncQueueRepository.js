'use strict';
const BaseRepository = require('./BaseRepository');
const { nowIso, isoIn, backoffMs } = require('../utils/time');

class SyncQueueRepository extends BaseRepository {
  constructor({ db }) { super({ db, table: 'sync_queue', jsonFields: ['payload'] }); }

  findByIdempotencyKey(key) { return this.findOneBy('idempotency_key', key); }

  /**
   * Enqueue is idempotent: re-queuing the same logical change replaces the payload
   * of a still-pending item rather than creating a duplicate outbox row.
   */
  async enqueue(item, executor = this.db) {
    const existing = await executor.get(
      'SELECT * FROM sync_queue WHERE idempotency_key = ?', [item.idempotency_key],
    );
    if (existing) {
      if (existing.status === 'synced') return this.fromRow(existing);
      await executor.run(
        "UPDATE sync_queue SET payload = ?, status = 'pending', next_attempt_at = ?, last_error = NULL WHERE id = ?",
        [JSON.stringify(item.payload), nowIso(), existing.id],
      );
      return this.findById(existing.id, { executor });
    }
    return this.create({ ...item, status: 'pending', next_attempt_at: nowIso() }, executor);
  }

  /** Claims a batch of due items and marks them in_flight so parallel workers do not double-send. */
  async claimBatch(limit) {
    const rows = await this.db.all(
      `SELECT * FROM sync_queue
        WHERE status IN ('pending','failed') AND next_attempt_at <= ? AND attempts < max_attempts
        ORDER BY created_at ASC LIMIT ?`,
      [nowIso(), limit],
    );
    for (const r of rows) {
      await this.db.run("UPDATE sync_queue SET status = 'in_flight' WHERE id = ?", [r.id]);
    }
    return this.mapRows(rows);
  }

  markSynced(id) {
    return this.db.run(
      "UPDATE sync_queue SET status = 'synced', synced_at = ?, last_error = NULL WHERE id = ?",
      [nowIso(), id],
    );
  }

  async markFailed(id, error, baseBackoff) {
    const item = await this.findById(id);
    const attempts = (item?.attempts || 0) + 1;
    const exhausted = attempts >= (item?.max_attempts || 8);
    return this.db.run(
      'UPDATE sync_queue SET status = ?, attempts = ?, next_attempt_at = ?, last_error = ? WHERE id = ?',
      [
        exhausted ? 'failed' : 'pending',
        attempts,
        isoIn(backoffMs(attempts, baseBackoff)),
        String(error).slice(0, 1000),
        id,
      ],
    );
  }

  markConflict(id, detail) {
    return this.db.run(
      "UPDATE sync_queue SET status = 'conflict', last_error = ? WHERE id = ?",
      [String(detail).slice(0, 1000), id],
    );
  }

  /** Releases items stuck in_flight after a crash or power loss mid-push. */
  requeueStale(olderThanIso) {
    return this.db.run(
      "UPDATE sync_queue SET status = 'pending' WHERE status = 'in_flight' AND updated_at < ?",
      [olderThanIso],
    );
  }

  async summary() {
    const rows = await this.db.all('SELECT * FROM v_sync_status');
    const byStatus = await this.db.all('SELECT status, COUNT(*) AS c FROM sync_queue GROUP BY status');
    const oldest = await this.db.get(
      "SELECT MIN(created_at) AS oldest FROM sync_queue WHERE status IN ('pending','failed')",
    );
    return {
      byEntity: rows,
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, Number(r.c)])),
      oldestPendingAt: oldest?.oldest || null,
    };
  }

  listConflicts({ limit = 50 } = {}) {
    return this.findBy({ status: 'conflict' }, { orderBy: 'updated_at DESC', limit });
  }
}

module.exports = SyncQueueRepository;
