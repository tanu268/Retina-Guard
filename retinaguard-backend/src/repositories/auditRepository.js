'use strict';
const BaseRepository = require('./BaseRepository');
const { hashObject } = require('../utils/hash');
const { uuid } = require('../utils/ids');

/**
 * Append-only, hash-chained audit trail. Each entry hashes its own content plus
 * the previous entry's hash, so any tampering with history is detectable even if
 * someone bypasses the database triggers.
 */
class AuditRepository extends BaseRepository {
  constructor({ db }) {
    super({ db, table: 'audit_logs', jsonFields: ['before_state', 'after_state'] });
  }

  async lastHash(executor = this.db) {
    const row = await executor.get('SELECT hash FROM audit_logs ORDER BY sequence DESC, created_at DESC LIMIT 1');
    return row?.hash || null;
  }

  async append(entry, executor = this.db) {
    const prevHash = await this.lastHash(executor);
    const id = entry.id || uuid();
    const createdAt = entry.created_at || new Date().toISOString();
    const material = {
      id,
      case_id: entry.case_id ?? null,
      actor_id: entry.actor_id ?? null,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      before_state: entry.before_state ?? null,
      after_state: entry.after_state ?? null,
      created_at: createdAt,
      prev_hash: prevHash,
    };
    return this.create(
      { ...entry, id, created_at: createdAt, prev_hash: prevHash, hash: hashObject(material) },
      executor,
    );
  }

  listByCase(caseId, { limit = 200 } = {}) {
    return this.findBy({ case_id: caseId }, { orderBy: 'sequence ASC, created_at ASC', limit });
  }

  listByEntity(entityType, entityId, { limit = 200 } = {}) {
    return this.findBy({ entity_type: entityType, entity_id: entityId },
      { orderBy: 'sequence ASC, created_at ASC', limit });
  }

  /** Walks the chain and reports the first broken link, if any. */
  async verifyChain({ caseId } = {}) {
    const rows = caseId
      ? await this.listByCase(caseId, { limit: 10000 })
      : await this.findBy({}, { orderBy: 'sequence ASC, created_at ASC', limit: 100000 });

    let prev = null;
    for (const row of rows) {
      const material = {
        id: row.id,
        case_id: row.case_id ?? null,
        actor_id: row.actor_id ?? null,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id ?? null,
        before_state: row.before_state ?? null,
        after_state: row.after_state ?? null,
        created_at: row.created_at,
        prev_hash: caseId ? row.prev_hash : prev,
      };
      if (hashObject(material) !== row.hash) {
        return { valid: false, brokenAt: row.id, sequence: row.sequence, entries: rows.length };
      }
      prev = row.hash;
    }
    return { valid: true, entries: rows.length };
  }
}

module.exports = AuditRepository;
