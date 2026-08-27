'use strict';
const { toAnalysisDTO, toExplainabilityDTO } = require('../analysis/analysis.dto');
const { toCasePackageDTO } = require('../consultations/consultations.dto');
const { SCREENING_DISCLAIMER } = require('../../config/constants');

const num = (v) => (v === null || v === undefined ? null : Number(v));

const toQueueItemDTO = (r) => ({
  analysisId: r.id,
  consultationId: r.consultation_id,
  caseNumber: r.case_number,
  imageId: r.image_id,
  laterality: r.laterality,
  qualityGrade: r.quality_grade,
  patient: {
    name: r.patient_name, code: r.patient_code,
    ageYears: num(r.age_years), sex: r.sex,
  },
  priority: r.priority,
  // Every priority is carried as text as well as colour so the queue remains
  // readable for colourblind reviewers.
  priorityLabel: {
    P0: 'Urgent', P1: 'Referral', P2: 'Uncertain', P3: 'Routine',
  }[r.priority] || 'Unassigned',
  drGrade: r.dr_grade,
  drGradeCode: num(r.dr_grade_code),
  confidence: num(r.confidence),
  abstained: Number(r.abstained) === 1,
  referable: r.referable === null || r.referable === undefined ? null : Number(r.referable) === 1,
  status: r.status,
  consultationStatus: r.consultation_status,
  waitingSince: r.created_at,
});

const toReviewDTO = (r) => ({
  id: r.id,
  consultationId: r.consultation_id,
  analysisId: r.analysis_id,
  caseNumber: r.case_number || undefined,
  reviewer: { id: r.reviewer_id, name: r.reviewer_name || undefined, registrationNo: r.registration_no || undefined },
  decision: r.decision,
  finalGrade: r.final_grade || null,
  finalGradeCode: num(r.final_grade_code),
  finalReferable: r.final_referable === null || r.final_referable === undefined ? null : Number(r.final_referable) === 1,
  referralOutcome: r.referral_outcome || null,
  agreedWithAi: r.agreed_with_ai === null || r.agreed_with_ai === undefined ? null : Number(r.agreed_with_ai) === 1,
  overrideReason: r.override_reason || null,
  notes: r.notes || null,
  reviewDurationMs: num(r.review_duration_ms),
  reviewedAt: r.reviewed_at,
  createdAt: r.created_at,
});

/** Everything a reviewer needs on one screen to adjudicate without a second call. */
const toReviewCaseDTO = ({ pkg, analysis, explainability, review }) => ({
  ...toCasePackageDTO(pkg),
  currentAnalysis: analysis ? toAnalysisDTO(analysis) : null,
  explainability: explainability && analysis ? toExplainabilityDTO(explainability, analysis) : null,
  existingReview: review ? toReviewDTO(review) : null,
  reviewerGuidance: {
    mandatory: 'A human decision is required before any referral outcome is issued.',
    onAbstention: 'When the model abstained, no suggested grade is shown. Grade the image independently.',
    onDisagreement: 'If the attention map and the lesion evidence disagree, weigh the lesion evidence and the image itself.',
  },
  disclaimer: SCREENING_DISCLAIMER,
});

module.exports = { toQueueItemDTO, toReviewDTO, toReviewCaseDTO };
