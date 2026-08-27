'use strict';
const config = require('../../config');
const { decode } = require('../../utils/json');
const { SCREENING_DISCLAIMER, DR_GRADES } = require('../../config/constants');

const num = (v) => (v === null || v === undefined ? null : Number(v));
const bool = (v) => (v === null || v === undefined ? null : Number(v) === 1);

const toAnalysisDTO = (a) => ({
  id: a.id,
  consultationId: a.consultation_id,
  imageId: a.image_id,
  status: a.status,
  drGrade: a.dr_grade,
  drGradeCode: num(a.dr_grade_code),
  gradeProbabilities: decode(a.grade_probabilities, null),
  gradeScale: DR_GRADES.map((g) => ({ code: g.code, label: g.label, referable: g.referable })),
  confidence: num(a.confidence),
  referable: bool(a.referable),
  referableProbability: num(a.referable_probability),
  abstained: Number(a.abstained) === 1,
  abstainReason: a.abstain_reason || null,
  priority: a.priority,
  model: {
    version: a.model_version,
    hash: a.model_hash,
    preprocessingHash: a.preprocessing_hash,
    mode: a.matlab_mode,
  },
  stageTimings: decode(a.stage_timings, {}),
  warnings: decode(a.warnings, []),
  errorDetail: a.error_detail || null,
  startedAt: a.started_at,
  completedAt: a.completed_at,
  durationMs: num(a.duration_ms),
  requiresHumanReview: true,
  disclaimer: SCREENING_DISCLAIMER,
  createdAt: a.created_at,
});

const toExplainabilityDTO = (e, analysis) => ({
  id: e.id,
  analysisId: e.analysis_id,
  method: e.method,
  layers: decode(e.layers, []),
  images: {
    gradcamUrl: e.gradcam_path ? `${config.apiPrefix}/analysis/${e.analysis_id}/explainability/gradcam` : null,
    lesionOverlayUrl: e.lesion_overlay_path ? `${config.apiPrefix}/analysis/${e.analysis_id}/explainability/lesions` : null,
    anatomyOverlayUrl: e.anatomy_overlay_path ? `${config.apiPrefix}/analysis/${e.analysis_id}/explainability/anatomy` : null,
  },
  lesions: decode(e.lesions, []),
  anatomy: decode(e.anatomy, null),
  agreementScore: e.agreement_score === null || e.agreement_score === undefined ? null : Number(e.agreement_score),
  disagreementFlag: Number(e.disagreement_flag) === 1,
  interpretationNote:
    'Explanation layers show where the model attended and what evidence was detected. '
    + 'They are decision support for the reviewer, not a diagnosis, and an attention map alone is not proof of a lesion.',
  ...(analysis ? { drGrade: analysis.dr_grade, drGradeCode: num(analysis.dr_grade_code) } : {}),
  createdAt: e.created_at,
});

module.exports = { toAnalysisDTO, toExplainabilityDTO };
