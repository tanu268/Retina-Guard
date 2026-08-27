'use strict';
const AuditService = require('./auditService');

/**
 * Thin façade the rest of the app depends on. Keeps SyncManager focused on
 * replication mechanics while this layer adds audit + validation concerns.
 */
class SyncService {
  constructor({ syncManager, syncQueueRepository, auditService }) {
    this.manager = syncManager;
    this.queue = syncQueueRepository;
    this.audit = auditService;
  }

  enqueue(item, executor) { return this.manager.enqueue(item, executor); }

  async push(actor, req, opts) {
    const result = await this.manager.push(opts);
    await this.audit.record({
      action: AuditService.ACTIONS.SYNC_PUSHED, entityType: 'sync_queue', actor, req,
      after: result,
    });
    return result;
  }

  async pull(actor, req, opts) {
    const result = await this.manager.pull(opts);
    await this.audit.record({ action: AuditService.ACTIONS.SYNC_PULLED, entityType: 'sync_queue', actor, req, after: { pulled: result.pulled } });
    return result;
  }

  status() { return this.manager.status(); }
  conflicts(opts) { return this.queue.listConflicts(opts); }
}

module.exports = SyncService;
