'use strict';
const { uuid, caseNumber } = require('../utils/ids');
const { NotFoundError, ConflictError, ClinicalSafetyError } = require('../utils/errors');
const AuditService = require('./auditService');

class ConsultationService {
  constructor({ consultationRepository, patientRepository, auditService, syncService, eventBus, config }) {
    this.repo = consultationRepository;
    this.patients = patientRepository;
    this.audit = auditService;
    this.sync = syncService;
    this.eventBus = eventBus;
    this.config = config;
  }

  async create(input, actor, req) {
    const patient = await this.patients.findById(input.patientId);
    if (!patient) throw new NotFoundError('Patient');

    if (!input.identityConfirmed) {
      throw new ClinicalSafetyError(
        'Patient identity must be confirmed before creating a consultation (wrong-patient result is a critical risk).',
      );
    }

    const consultation = await this.repo.create({
      id: uuid(),
      case_number: caseNumber(this.config.node.siteId),
      patient_id: patient.id,
      technician_id: actor?.id ?? null,
      status: 'registered',
      notes: input.notes ?? null,
      site_id: this.config.node.siteId,
      device_id: input.deviceId || this.config.node.deviceId,
      identity_confirmed: true,
    });

    await this.sync.enqueue({ entityType: 'consultation', entityId: consultation.id, operation: 'create', payload: consultation, version: consultation.version });
    await this.audit.record({
      action: AuditService.ACTIONS.CONSULTATION_CREATED, entityType: 'consultation',
      entityId: consultation.id, caseId: consultation.id, actor, req, after: consultation,
    });
    this.eventBus?.emit?.('case_created', { consultationId: consultation.id, caseNumber: consultation.case_number });

    return consultation;
  }

  async get(id) {
    const consultation = await this.repo.findWithPatient(id);
    if (!consultation) throw new NotFoundError('Consultation');
    return consultation;
  }

  async update(id, patch, actor, req) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Consultation');

    const allowedTransitions = ConsultationService.STATUS_TRANSITIONS[existing.status] || [];
    if (patch.status && patch.status !== existing.status && !allowedTransitions.includes(patch.status)) {
      throw new ClinicalSafetyError(
        `Cannot move consultation from '${existing.status}' to '${patch.status}'.`,
        { from: existing.status, to: patch.status, allowed: allowedTransitions },
      );
    }
    if (patch.status === 'closed') {
      const forCheck = { ...existing, status: 'closed', reviewer_id: existing.reviewer_id };
      this.config.clinical.mandatoryHumanReview && !existing.reviewer_id
        ? (() => { throw new ClinicalSafetyError('Cannot close a case without a recorded reviewer decision.'); })()
        : forCheck;
    }

    const updated = await this.repo.updateWithVersion(id, {
      status: patch.status ?? existing.status,
      reviewer_id: patch.reviewerId ?? existing.reviewer_id,
      triage_priority: patch.triagePriority ?? existing.triage_priority,
      notes: patch.notes ?? existing.notes,
      final_grade_code: patch.finalGradeCode ?? existing.final_grade_code,
      final_referable: patch.finalReferable ?? existing.final_referable,
      closed_at: patch.status === 'closed' ? new Date().toISOString() : existing.closed_at,
      sync_state: 'pending',
    }, existing.version);

    if (!updated) throw new ConflictError('Consultation was modified by another session; reload and retry.');

    await this.sync.enqueue({ entityType: 'consultation', entityId: id, operation: 'update', payload: updated, version: updated.version });
    await this.audit.record({
      action: AuditService.ACTIONS.CONSULTATION_UPDATED, entityType: 'consultation',
      entityId: id, caseId: id, actor, req, before: existing, after: updated,
    });
    this.eventBus?.emit?.('case_updated', { consultationId: id, status: updated.status });
    return updated;
  }

  list({ page = 1, limit = 20, status } = {}) {
    return this.repo.findBy(status ? { status } : {}, { limit, offset: (page - 1) * limit }).then(async (items) => ({
      items, total: await this.repo.count(status ? { status } : {}),
    }));
  }
}

/** A case may only move forward through the lifecycle, never skip mandatory review. */
ConsultationService.STATUS_TRANSITIONS = Object.freeze({
  registered: ['capture_pending', 'cancelled'],
  capture_pending: ['quality_failed', 'analysis_pending', 'cancelled'],
  quality_failed: ['capture_pending', 'awaiting_review', 'cancelled'],
  analysis_pending: ['analysis_complete', 'quality_failed', 'cancelled'],
  analysis_complete: ['awaiting_review'],
  awaiting_review: ['review_complete', 'cancelled'],
  review_complete: ['closed'],
  closed: [],
  cancelled: [],
});

module.exports = ConsultationService;
