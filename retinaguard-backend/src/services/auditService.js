'use strict';
const { config } = require('../config');
const logger = require('../utils/logger');

/**
 * Thin façade over the append-only audit repository so that every module writes
 * audit entries the same way and no module can accidentally mutate one.
 *
 * Audit failures never break a clinical action: the write is logged loudly and
 * the caller continues. Losing a case is worse than losing an audit row, and the
 * hash chain makes any gap detectable.
 */
class AuditService {
  static ACTIONS = {
    LOGIN_FAILURE: 'login_failure',
    LOGIN_SUCCESS: 'login_success',
    TOKEN_REFRESH: 'token_refresh',
    LOGOUT: 'logout',
    USER_CREATED: 'user_created',
    CONSULTATION_CREATED: 'consultation_created',
    CONSULTATION_UPDATED: 'consultation_updated',
    IMAGE_UPLOADED: 'image_uploaded',
    IMAGE_QUALITY_ASSESSED: 'image_quality_assessed',
    IMAGE_QUALITY_REFUSED: 'image_quality_refused',
    IMAGE_DELETED: 'image_deleted',
    RECAPTURE_EXHAUSTED: 'recapture_exhausted',
    ANALYSIS_STARTED: 'analysis_started',
    ANALYSIS_COMPLETED: 'analysis_completed',
    ANALYSIS_ABSTAINED: 'analysis_abstained',
    REVIEW_OPENED: 'review_opened',
    REVIEW_DECIDED: 'review_decided',
    REVIEW_OVERRIDE: 'review_override',
    REPORT_GENERATED: 'report_generated',
    PATIENT_CREATED: 'patient_created',
    PATIENT_UPDATED: 'patient_updated',
    SYNC_PUSHED: 'sync_pushed',
    SYNC_PULLED: 'sync_pulled',
  };

  constructor({ auditRepository, nodeId = config.node.deviceId } = {}) {
    this.auditRepository = auditRepository;
    this.nodeId = nodeId;
  }

  async record({ action, entityType, entityId = null, caseId = null, actor = null, before = null, after = null, reason = null, req = null, ip = null }) {
    try {
      return await this.auditRepository.append({
        action,
        entity_type: entityType,
        entity_id: entityId,
        case_id: caseId,
        actor_id: actor?.id || null,
        actor_role: actor?.role || null,
        before_state: before,
        after_state: after,
        reason,
        ip_address: ip || req?.ip || null,
        user_agent: req?.get?.('user-agent') || null,
        site_id: config.node.siteId,
        device_id: config.node.deviceId,
      });
    } catch (err) {
      logger.error({ err: err.message, action, entityType, entityId }, 'Audit append failed');
      return null;
    }
  }

  /** Convenience wrapper for handlers that already have the Express request. */
  fromRequest(req, payload) {
    return this.record({ ...payload, actor: req.user, ip: req.context?.ip });
  }

  listByCase(caseId) { return this.auditRepository.listByCase(caseId); }
  verifyChain(opts) { return this.auditRepository.verifyChain(opts); }
}

module.exports = AuditService;
