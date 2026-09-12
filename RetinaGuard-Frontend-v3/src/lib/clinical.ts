/**
 * Clinical vocabulary and safety rules, mirrored from the backend's
 * ClinicalSafetyService so the UI can enforce them before the network round
 * trip instead of surfacing a 409 after the reviewer has finished typing.
 *
 * This file is the single place any clinical wording lives. If a string that
 * reaches a clinician is not defined here, it has not been reviewed.
 */

import type {
  AbstainReason, DrGradeCode, QualityGrade, ReferralUrgency,
  ReviewDecision, TriagePriority, LesionType, ConsultationStatus,
} from '../types';

/** Terms that must never reach a user-facing string. Mirrors PROHIBITED_TERMS
 *  in src/services/clinicalSafetyService.js. The backend rejects these with a
 *  409; we warn before submit so the reviewer can rephrase in place. */
export const PROHIBITED_TERMS: Record<string, string> = {
  diagnosis: 'screening result',
  diagnose: 'screen',
  diagnosed: 'screened',
  diagnostic: 'screening',
  normal: 'no apparent DR findings',
  healthy: 'no apparent DR findings',
  'disease-free': 'no apparent DR findings',
  cured: 'no apparent DR findings',
  confirmed: 'indicated',
  certain: 'high-confidence',
  guaranteed: 'expected',
  'rule out': 'does not replace clinical examination for',
  'you are fine': 'this screening found no apparent DR',
};

export interface SafetyViolation { term: string; suggestion: string }

/** Client-side mirror of clinicalSafetyService.lint. */
export function lintClinicalText(text: string | null | undefined): SafetyViolation[] {
  if (!text || typeof text !== 'string') return [];
  return Object.keys(PROHIBITED_TERMS)
    .filter((term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
    })
    .map((term) => ({ term, suggestion: PROHIBITED_TERMS[term] }));
}

export const MANDATORY_DISCLAIMER =
  'AI-assisted screening result. Not a diagnosis. Every result is reviewed by a '
  + 'qualified human reviewer before any referral decision is issued. This screening '
  + 'does not replace a dilated clinical eye examination.';

export const ABSTENTION_MESSAGE =
  'The automated screening did not reach a confident result for this image. '
  + 'The case has been placed in the human review queue.';

export const QUALITY_REFUSAL_MESSAGE =
  'This image cannot be assessed reliably. Follow the retake guidance below. '
  + 'No screening result is issued for an unreadable image.';

/** The banner that must accompany every AI output surface. */
export const AI_RESULT_HEADING = 'AI Screening Result';
export const HUMAN_REVIEW_NOTICE = 'Human review required';

// ── ICDR grading ─────────────────────────────────────────────────────────

export interface GradeDefinition {
  code: DrGradeCode;
  label: string;
  short: string;
  referable: boolean;
  description: string;
}

export const DR_GRADES: GradeDefinition[] = [
  { code: 0, label: 'No Apparent DR', short: 'Grade 0', referable: false,
    description: 'No visible retinopathy findings in this image.' },
  { code: 1, label: 'Mild NPDR', short: 'Grade 1', referable: false,
    description: 'Microaneurysms only.' },
  { code: 2, label: 'Moderate NPDR', short: 'Grade 2', referable: true,
    description: 'More than microaneurysms, less than severe NPDR.' },
  { code: 3, label: 'Severe NPDR', short: 'Grade 3', referable: true,
    description: 'Extensive haemorrhages, venous beading, or IRMA.' },
  { code: 4, label: 'Proliferative DR', short: 'Grade 4', referable: true,
    description: 'Neovascularisation or vitreous/preretinal haemorrhage.' },
];

export function gradeByCode(code: DrGradeCode | null | undefined): GradeDefinition | null {
  if (code === null || code === undefined) return null;
  return DR_GRADES.find((g) => g.code === code) ?? null;
}

// ── Triage ───────────────────────────────────────────────────────────────

export interface TriageDefinition {
  code: TriagePriority;
  label: string;
  meaning: string;
  targetWindow: string;
}

/** Colour is carried in CSS tokens; every consumer must also render `label`. */
export const TRIAGE_TIERS: Record<TriagePriority, TriageDefinition> = {
  P0: { code: 'P0', label: 'Urgent', meaning: 'Severe NPDR or proliferative findings indicated.', targetWindow: 'Review same day' },
  P1: { code: 'P1', label: 'Priority', meaning: 'Referable findings, abstention, or ungradeable image.', targetWindow: 'Review within 24 hours' },
  P2: { code: 'P2', label: 'Scheduled', meaning: 'Mild findings indicated.', targetWindow: 'Review within 7 days' },
  P3: { code: 'P3', label: 'Routine', meaning: 'No apparent DR findings.', targetWindow: 'Routine review' },
};

export const TRIAGE_ORDER: TriagePriority[] = ['P0', 'P1', 'P2', 'P3'];

// ── Abstention ───────────────────────────────────────────────────────────

export const ABSTAIN_REASONS: Record<AbstainReason, { label: string; guidance: string }> = {
  LOW_CONFIDENCE: {
    label: 'Low confidence',
    guidance: 'Model confidence fell below the abstention threshold. No grade is published.',
  },
  UNGRADEABLE_IMAGE: {
    label: 'Ungradeable image',
    guidance: 'Image quality was insufficient to assess. Recapture or escalate.',
  },
  EXPLANATION_DISAGREEMENT: {
    label: 'Evidence disagreement',
    guidance: 'The attention map highlighted a region where the lesion detector found nothing.',
  },
  STAGE_FAILURE: {
    label: 'Pipeline stage failed',
    guidance: 'A processing stage did not complete. The case needs human assessment.',
  },
  BORDERLINE_THRESHOLD: {
    label: 'Borderline result',
    guidance: 'The referable probability sat too close to the decision threshold to call.',
  },
};

// ── Image quality ────────────────────────────────────────────────────────

export const QUALITY_GRADES: Record<QualityGrade, { label: string; usable: boolean; guidance: string }> = {
  A: { label: 'Grade A', usable: true, guidance: 'Good quality. Suitable for screening.' },
  B: { label: 'Grade B', usable: true, guidance: 'Adequate quality. Interpret evidence with caution.' },
  C: { label: 'Grade C', usable: false, guidance: 'Not assessable. Recapture required.' },
};

export const QUALITY_METRIC_LABELS: Record<string, { label: string; hint: string }> = {
  focusScore: { label: 'Focus', hint: 'Sharpness of retinal detail' },
  illuminationUniformity: { label: 'Illumination', hint: 'Evenness of light across the field' },
  contrast: { label: 'Contrast', hint: 'Separation between vessels and background' },
  fieldCoverage: { label: 'Field coverage', hint: 'Proportion of the retinal field captured' },
};

// ── Reviewer decisions ───────────────────────────────────────────────────

export const REVIEW_DECISIONS: Record<ReviewDecision, { label: string; description: string }> = {
  refer: { label: 'Refer', description: 'Send to an ophthalmologist for clinical examination.' },
  routine_recall: { label: 'Routine recall', description: 'No referral now. Re-screen at the routine interval.' },
  repeat_imaging: { label: 'Repeat imaging', description: 'Image is not sufficient. Bring the patient back for recapture.' },
  escalate: { label: 'Escalate', description: 'Send to a senior reviewer or district specialist.' },
};

export const REFERRAL_URGENCIES: Record<ReferralUrgency, { label: string; description: string }> = {
  immediate: { label: 'Immediate', description: 'Same-day ophthalmology contact' },
  within_1_week: { label: 'Within 1 week', description: 'Appointment inside seven days' },
  within_1_month: { label: 'Within 1 month', description: 'Appointment inside one month' },
  routine: { label: 'Routine', description: 'Next scheduled screening cycle' },
};

// ── Lesions ──────────────────────────────────────────────────────────────

export const LESION_LABELS: Record<LesionType, string> = {
  microaneurysm: 'Microaneurysm',
  haemorrhage: 'Haemorrhage',
  hard_exudate: 'Hard exudate',
  soft_exudate: 'Soft exudate',
  neovascularisation: 'Neovascularisation',
  venous_beading: 'Venous beading',
};

// ── Consultation status ──────────────────────────────────────────────────

export const STATUS_LABELS: Record<ConsultationStatus, string> = {
  registered: 'Registered',
  capture_pending: 'Awaiting capture',
  quality_failed: 'Quality failed',
  analysis_pending: 'Analysis pending',
  analysis_complete: 'Analysis complete',
  awaiting_review: 'Awaiting review',
  review_complete: 'Review complete',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

/** Statuses that mean the technician still has work to do on this case. */
export const OPEN_STATUSES: ConsultationStatus[] = [
  'registered', 'capture_pending', 'quality_failed', 'analysis_pending',
];

// ── Pipeline stages ──────────────────────────────────────────────────────

/** Order matters: this is the sequence the MATLAB pipeline actually runs. */
export const PIPELINE_STAGES: Array<{ key: string; label: string }> = [
  { key: 'quality_assessment', label: 'Quality assessment' },
  { key: 'preprocess', label: 'Preprocessing' },
  { key: 'anatomy_detection', label: 'Anatomy detection' },
  { key: 'dr_grading', label: 'DR grading' },
  { key: 'lesion_detection', label: 'Lesion detection' },
  { key: 'gradcam', label: 'Grad-CAM' },
];
