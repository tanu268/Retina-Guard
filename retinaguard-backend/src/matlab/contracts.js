'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MATLAB ↔ Node contract.
 *
 * These shapes are the frozen interface between the Express backend and the
 * MATLAB pipeline. The mock adapter and the real CLI adapter must both return
 * exactly these shapes; the frontend never learns which one produced them.
 *
 * Clinical vocabulary follows the ICDR five-class scale. Labels are the only
 * grade strings permitted to reach a user-facing surface — see
 * services/clinicalSafety.js.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const DR_GRADES = Object.freeze([
  { code: 0, key: 'no_apparent_dr', label: 'No Apparent DR',  referable: false, priority: 'P3' },
  { code: 1, key: 'mild_npdr',      label: 'Mild NPDR',       referable: false, priority: 'P2' },
  { code: 2, key: 'moderate_npdr',  label: 'Moderate NPDR',   referable: true,  priority: 'P1' },
  { code: 3, key: 'severe_npdr',    label: 'Severe NPDR',     referable: true,  priority: 'P0' },
  { code: 4, key: 'pdr',            label: 'PDR',             referable: true,  priority: 'P0' },
]);

const QUALITY_GRADES = Object.freeze(['A', 'B', 'C']);

/** Actionable recapture reasons. The technician must be told what to fix, not just "bad image". */
const QUALITY_REASON_CODES = Object.freeze({
  UNDEREXPOSED:      'Image is too dark — increase flash intensity and retake.',
  OVEREXPOSED:       'Image is washed out — reduce flash intensity and retake.',
  OUT_OF_FOCUS:      'Image is blurred — refocus on the optic disc and hold steady.',
  MOTION_BLUR:       'Patient or camera moved — ask the patient to fixate and retake.',
  LENS_ARTIFACT:     'Dust or smudge on the lens — clean the lens and retake.',
  SMALL_PUPIL:       'Pupil too small — dim the room light, wait 2 minutes, then retake.',
  POOR_CENTRATION:   'Macula not centred — recentre between the optic disc and fovea.',
  PARTIAL_FIELD:     'Retinal field incomplete — reposition the camera and retake.',
  MEDIA_OPACITY:     'View obstructed (possible cataract) — refer for clinical examination.',
});

const LESION_TYPES = Object.freeze([
  'microaneurysm', 'haemorrhage', 'hard_exudate', 'soft_exudate', 'neovascularisation', 'venous_beading',
]);

const ABSTAIN_REASONS = Object.freeze({
  LOW_CONFIDENCE:          'Model confidence below the configured operating threshold.',
  UNGRADEABLE_IMAGE:       'Image quality insufficient for automated assessment.',
  EXPLANATION_DISAGREEMENT:'Attention map and lesion evidence disagree.',
  STAGE_FAILURE:           'A pipeline stage failed; no partial result is issued.',
  BORDERLINE_THRESHOLD:    'Referable probability sits within the borderline band.',
  MODEL_NOT_INTEGRATED:    'The diagnostic model has not yet been integrated on this node. This case requires manual grading by the reviewer.',
});

const PIPELINE_STAGES = Object.freeze([
  'quality_assessment', 'preprocess', 'anatomy_detection',
  'lesion_detection', 'dr_grading', 'gradcam',
]);

const gradeByCode = (code) => DR_GRADES.find((g) => g.code === Number(code)) || null;
const gradeByLabel = (label) => DR_GRADES.find((g) => g.label === label) || null;

/**
 * Minimal structural validation of anything returned by a MATLAB adapter.
 * A malformed pipeline response must fail loudly, never become a silent grade.
 */
function assertGradingResponse(res) {
  const errors = [];
  if (!res || typeof res !== 'object') return ['Response is not an object'];
  if (!Array.isArray(res.gradeProbabilities) || res.gradeProbabilities.length !== 5) {
    errors.push('gradeProbabilities must be an array of 5 class probabilities');
  } else {
    const sum = res.gradeProbabilities.reduce((a, b) => a + Number(b), 0);
    if (Math.abs(sum - 1) > 0.02) errors.push(`gradeProbabilities must sum to 1 (got ${sum.toFixed(4)})`);
  }
  if (!gradeByCode(res.drGradeCode)) errors.push('drGradeCode must be an integer 0–4');
  if (typeof res.confidence !== 'number' || res.confidence < 0 || res.confidence > 1) {
    errors.push('confidence must be a number in [0,1]');
  }
  if (typeof res.referableProbability !== 'number') errors.push('referableProbability must be a number');
  if (typeof res.modelVersion !== 'string' || !res.modelVersion) errors.push('modelVersion is required');
  return errors;
}

function assertQualityResponse(res) {
  const errors = [];
  if (!res || typeof res !== 'object') return ['Response is not an object'];
  if (!QUALITY_GRADES.includes(res.qualityGrade)) errors.push('qualityGrade must be A, B or C');
  if (typeof res.qualityScore !== 'number') errors.push('qualityScore must be a number');
  if (!Array.isArray(res.reasons)) errors.push('reasons must be an array');
  return errors;
}

module.exports = {
  DR_GRADES, QUALITY_GRADES, QUALITY_REASON_CODES, LESION_TYPES,
  ABSTAIN_REASONS, PIPELINE_STAGES,
  gradeByCode, gradeByLabel, assertGradingResponse, assertQualityResponse,
};
