'use strict';

/**
 * Domain constants for RetinaGuard.
 *
 * CLINICAL-SAFETY LANGUAGE RULE (blueprint §05 "Clinical safety boundary"):
 * The product is AI-assisted *screening / triage*, never autonomous diagnosis.
 * Therefore no label below uses the words "diagnosis", "diagnosed" or "normal".
 * Grade 0 is rendered as "No DR detected", never "Normal".
 */

const ROLES = Object.freeze({
  TECHNICIAN: 'TECHNICIAN',
  REVIEWER: 'REVIEWER',
  ADMIN: 'ADMIN',
});

/** ICDR five-class severity scale. */
const DR_GRADES = Object.freeze([
  { code: 0, key: 'NO_DR', label: 'No DR detected', referable: false },
  { code: 1, key: 'MILD_NPDR', label: 'Mild NPDR', referable: false },
  { code: 2, key: 'MODERATE_NPDR', label: 'Moderate NPDR', referable: true },
  { code: 3, key: 'SEVERE_NPDR', label: 'Severe NPDR', referable: true },
  { code: 4, key: 'PDR', label: 'Proliferative DR', referable: true },
]);

const DR_GRADE_BY_CODE = Object.freeze(
  DR_GRADES.reduce((acc, g) => ({ ...acc, [g.code]: g }), {})
);

/** Referable DR = ICDR grade >= 2 (blueprint §05: "Target ... P(grade >= 2)"). */
const REFERABLE_MIN_GRADE = 2;

const QUALITY_GRADES = Object.freeze({ A: 'A', B: 'B', C: 'C' });

/** Actionable recapture reason registry (blueprint §06 "Grade C -> actionable retake"). */
const QUALITY_REASONS = Object.freeze({
  OUT_OF_FOCUS: 'Image is out of focus — steady the camera and refocus on the optic disc.',
  UNDEREXPOSED: 'Image is too dark — increase illumination and retake.',
  OVEREXPOSED: 'Image is washed out — reduce illumination and retake.',
  LENS_ARTEFACT: 'Dust or smudge artefact detected — clean the lens and retake.',
  OFF_CENTRE: 'Macula is not centred — recentre on the macula and retake.',
  PARTIAL_FIELD: 'Field of view is clipped — align the camera and retake.',
  MOTION_BLUR: 'Motion blur detected — ask the patient to hold steady and retake.',
  SMALL_PUPIL: 'Pupil aperture too small — dim the room, wait, and retake.',
});

/** Triage tiers used by the reviewer queue (blueprint domain terminology). */
const PRIORITY = Object.freeze({
  P0: 'P0', // Urgent — PDR / severe findings / identity or safety block
  P1: 'P1', // Referable — grade >= 2
  P2: 'P2', // Abstained / ungradeable / explanation disagreement
  P3: 'P3', // Routine — non-referable, awaiting confirmatory review
});

const CONSULTATION_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  AWAITING_CAPTURE: 'AWAITING_CAPTURE',
  QUALITY_REJECTED: 'QUALITY_REJECTED',
  ANALYSING: 'ANALYSING',
  AWAITING_REVIEW: 'AWAITING_REVIEW',
  REVIEWED: 'REVIEWED',
  CLOSED: 'CLOSED',
  ESCALATED: 'ESCALATED',
});

const IMAGE_STATUS = Object.freeze({
  UPLOADED: 'UPLOADED',
  QUALITY_PASSED: 'QUALITY_PASSED',
  QUALITY_REJECTED: 'QUALITY_REJECTED',
  ANALYSED: 'ANALYSED',
  DELETED: 'DELETED',
});

const ANALYSIS_STATUS = Object.freeze({
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  ABSTAINED: 'ABSTAINED',
  FAILED: 'FAILED',
});

const REVIEW_DECISION = Object.freeze({
  CONFIRM: 'CONFIRM',       // agrees with AI-assisted screening output
  OVERRIDE: 'OVERRIDE',     // reviewer sets a different grade
  ESCALATE: 'ESCALATE',     // send to ophthalmologist / higher centre
  RECAPTURE: 'RECAPTURE',   // send back to technician for a new image
});

const REFERRAL_OUTCOME = Object.freeze({
  REFER: 'REFER',
  ROUTINE_RESCREEN: 'ROUTINE_RESCREEN',
  RECAPTURE: 'RECAPTURE',
  ESCALATED: 'ESCALATED',
});

const LATERALITY = Object.freeze({ OD: 'OD', OS: 'OS' }); // right eye / left eye

const SYNC_STATUS = Object.freeze({
  PENDING: 'PENDING',
  IN_FLIGHT: 'IN_FLIGHT',
  SYNCED: 'SYNCED',
  CONFLICT: 'CONFLICT',
  FAILED: 'FAILED',
  DEAD_LETTER: 'DEAD_LETTER',
});

const SYNC_ENTITIES = Object.freeze([
  'patients', 'consultations', 'images', 'analysis_results',
  'explainability', 'reviews', 'reports', 'audit_logs',
]);

const AUDIT_ACTIONS = Object.freeze({
  LOGIN: 'LOGIN', LOGOUT: 'LOGOUT', TOKEN_REFRESH: 'TOKEN_REFRESH',
  PATIENT_CREATED: 'PATIENT_CREATED', PATIENT_UPDATED: 'PATIENT_UPDATED',
  CONSULTATION_CREATED: 'CONSULTATION_CREATED', CONSULTATION_UPDATED: 'CONSULTATION_UPDATED',
  IMAGE_UPLOADED: 'IMAGE_UPLOADED', IMAGE_DELETED: 'IMAGE_DELETED',
  QUALITY_ASSESSED: 'QUALITY_ASSESSED', QUALITY_REJECTED: 'QUALITY_REJECTED',
  ANALYSIS_STARTED: 'ANALYSIS_STARTED', ANALYSIS_COMPLETED: 'ANALYSIS_COMPLETED',
  ANALYSIS_ABSTAINED: 'ANALYSIS_ABSTAINED', ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  REVIEW_ASSIGNED: 'REVIEW_ASSIGNED', REVIEW_SUBMITTED: 'REVIEW_SUBMITTED',
  REPORT_GENERATED: 'REPORT_GENERATED', REPORT_DOWNLOADED: 'REPORT_DOWNLOADED',
  IDENTITY_BLOCK: 'IDENTITY_BLOCK',
  SYNC_PUSHED: 'SYNC_PUSHED', SYNC_PULLED: 'SYNC_PULLED', SYNC_CONFLICT: 'SYNC_CONFLICT',
  USER_CREATED: 'USER_CREATED', USER_UPDATED: 'USER_UPDATED',
});

const WS_EVENTS = Object.freeze({
  CASE_CREATED: 'case_created',
  CASE_UPDATED: 'case_updated',
  REVIEW_COMPLETED: 'review_completed',
  SYNC_FINISHED: 'sync_finished',
});

/** Fixed disclaimer applied to every machine-readable and printable report. */
const SCREENING_DISCLAIMER =
  'AI-assisted screening support output. This is not a diagnosis and does not replace ' +
  'examination by a qualified ophthalmologist. Every case is adjudicated by a human reviewer ' +
  'before a referral decision is issued.';

module.exports = {
  ROLES, DR_GRADES, DR_GRADE_BY_CODE, REFERABLE_MIN_GRADE,
  QUALITY_GRADES, QUALITY_REASONS, PRIORITY,
  CONSULTATION_STATUS, IMAGE_STATUS, ANALYSIS_STATUS,
  REVIEW_DECISION, REFERRAL_OUTCOME, LATERALITY,
  SYNC_STATUS, SYNC_ENTITIES, AUDIT_ACTIONS, WS_EVENTS,
  SCREENING_DISCLAIMER,
};
