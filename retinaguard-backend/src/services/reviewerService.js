'use strict';
const { uuid } = require('../utils/ids');
const { NotFoundError, ConflictError, ClinicalSafetyError } = require('../utils/errors');
const AuditService = require('./auditService');
const { gradeByCode } = require('../matlab/contracts');

const DECISIONS = Object.freeze(['refer', 'routine_recall', 'repeat_imaging', 'escalate']);
const URGENCIES = Object.freeze(['immediate', 'within_1_week', 'within_1_month', 'routine']);

/**
 * Human-in-the-loop adjudication. Blueprint §06: human review is the terminal
 * safety control — nothing here may be skipped or auto-approved.
 */
class ReviewerService {
  constructor({
    reviewRepository, consultationRepository, analysisRepository,
    clinicalSafetyService, auditService, syncService, eventBus,
  }) {
    this.repo = reviewRepository;
    this.consultations = consultationRepository;
    this.analyses = analysisRepository;
    this.safety = clinicalSafetyService;
    this.audit = auditService;
    this.sync = syncService;
    this.eventBus = eventBus;
  }

  queue(opts) { return this.consultations.reviewQueue(opts); }

  async getCase(consultationId) {
    const consultation = await this.consultations.findWithPatient(consultationId);
    if (!consultation) throw new NotFoundError('Consultation');
    const analyses = await this.analyses.listByConsultation(consultationId);
    const review = await this.repo.findByConsultation(consultationId);
    return { consultation, analyses, review };
  }

  async decide(consultationId, input, actor, req) {
    this.safety.assertSafeLanguage(input.notes, 'review.notes');
    this.safety.assertSafeLanguage(input.overrideReason, 'review.overrideReason');

    if (!DECISIONS.includes(input.decision)) {
      throw new ClinicalSafetyError(`decision must be one of: ${DECISIONS.join(', ')}`);
    }
    if (input.referralUrgency && !URGENCIES.includes(input.referralUrgency)) {
      throw new ClinicalSafetyError(`referralUrgency must be one of: ${URGENCIES.join(', ')}`);
    }

    const consultation = await this.consultations.findById(consultationId);
    if (!consultation) throw new NotFoundError('Consultation');

    const existing = await this.repo.findByConsultation(consultationId);
    if (existing) throw new ConflictError('This case has already been reviewed.', { reviewId: existing.id });

    const analyses = await this.analyses.listByConsultation(consultationId);
    const latest = analyses[0] || null;
    const aiGradeCode = latest?.dr_grade_code ?? null;
    const agreement = aiGradeCode === null ? null : aiGradeCode === input.reviewerGradeCode;

    const startedAt = input.reviewStartedAt ? new Date(input.reviewStartedAt) : null;
    const completedAt = new Date();
    const durationSeconds = startedAt ? Math.max(0, Math.round((completedAt - startedAt) / 1000)) : null;

    let review;
    try {
      review = await this.repo.create({
        id: uuid(),
        consultation_id: consultationId,
        analysis_id: latest?.id ?? null,
        reviewer_id: actor.id,
        ai_grade_code: aiGradeCode,
        reviewer_grade_code: input.reviewerGradeCode,
        agreement,
        decision: input.decision,
        referral_urgency: input.referralUrgency ?? null,
        override_reason: agreement === false ? (input.overrideReason || null) : null,
        notes: input.notes ?? null,
        review_started_at: input.reviewStartedAt ?? null,
        review_completed_at: completedAt.toISOString(),
        duration_seconds: durationSeconds,
      });
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        throw new ConflictError('This case has already been reviewed.');
      }
      throw err;
    }

    const reviewerGrade = gradeByCode(input.reviewerGradeCode);
    await this.consultations.update(consultationId, {
      status: 'review_complete',
      reviewer_id: actor.id,
      final_grade_code: input.reviewerGradeCode,
      final_referable: reviewerGrade?.referable ?? (input.decision === 'refer'),
    });

    await this.sync.enqueue({ entityType: 'review', entityId: review.id, operation: 'create', payload: review });
    await this.audit.record({
      action: agreement === false ? AuditService.ACTIONS.REVIEW_OVERRIDE : AuditService.ACTIONS.REVIEW_DECIDED,
      entityType: 'review', entityId: review.id, caseId: consultationId, actor, req,
      after: { decision: input.decision, agreement, reviewerGradeCode: input.reviewerGradeCode },
    });
    this.eventBus?.emit?.('review_completed', { consultationId, reviewId: review.id, decision: input.decision });

    return review;
  }

  async openForReview(consultationId, actor, req) {
    await this.audit.record({
      action: AuditService.ACTIONS.REVIEW_OPENED, entityType: 'consultation', entityId: consultationId,
      caseId: consultationId, actor, req,
    });
    return { openedAt: new Date().toISOString() };
  }

  workloadStats(opts) { return this.repo.workloadStats(opts); }
}

module.exports = ReviewerService;
