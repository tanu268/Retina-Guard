'use strict';
const { ClinicalSafetyError } = require('../utils/errors');
const { gradeByCode } = require('../matlab/contracts');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Clinical safety vocabulary and rules.
 *
 * RetinaGuard is an AI-assisted SCREENING and TRIAGE aid. It does not diagnose.
 * The blueprint makes this a non-negotiable product boundary, so it is enforced
 * in code rather than left to whoever writes the next UI string.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Terms that must never appear in a user-facing string produced by this system. */
const PROHIBITED_TERMS = Object.freeze({
  diagnosis:    'screening result',
  diagnose:     'screen',
  diagnosed:    'screened',
  diagnostic:   'screening',
  normal:       'no apparent DR findings',
  healthy:      'no apparent DR findings',
  'disease-free': 'no apparent DR findings',
  cured:        'no apparent DR findings',
  confirmed:    'indicated',
  certain:      'high-confidence',
  guaranteed:   'expected',
  'rule out':   'does not replace clinical examination for',
  'you are fine': 'this screening found no apparent DR',
});

const MANDATORY_DISCLAIMER =
  'AI-assisted screening result. Not a diagnosis. Every result is reviewed by a '
  + 'qualified human reviewer before any referral decision is issued. This screening '
  + 'does not replace a dilated clinical eye examination.';

const ABSTENTION_MESSAGE =
  'The automated screening did not reach a confident result for this image. '
  + 'The case has been placed in the human review queue.';

const QUALITY_REFUSAL_MESSAGE =
  'This image cannot be assessed reliably. Please follow the retake guidance below. '
  + 'No screening result is issued for an unreadable image.';

class ClinicalSafetyService {
  constructor({ config }) { this.config = config; }

  /** Returns the violations found in a user-facing string, without mutating it. */
  lint(text) {
    if (!text || typeof text !== 'string') return [];
    const lower = text.toLowerCase();
    return Object.keys(PROHIBITED_TERMS)
      .filter((term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(lower))
      .map((term) => ({ term, suggestion: PROHIBITED_TERMS[term] }));
  }

  /** Throws if a caller tries to persist prohibited language (e.g. reviewer notes). */
  assertSafeLanguage(text, field = 'text') {
    const violations = this.lint(text);
    if (violations.length) {
      throw new ClinicalSafetyError(
        `Prohibited clinical language in ${field}. UVI reports screening results, not diagnoses.`,
        { field, violations },
      );
    }
    return true;
  }

  /**
   * Triage priority. Abstentions and quality failures are escalated deliberately:
   * an uncertain case is more urgent to a human than a confident low grade.
   */
  triagePriority({ drGradeCode, abstained, qualityGrade, referable }) {
    if (qualityGrade === 'C') return 'P1';
    if (abstained) return 'P1';
    const grade = gradeByCode(drGradeCode);
    if (!grade) return 'P1';
    if (grade.code >= 3) return 'P0';
    if (grade.code === 2 || referable) return 'P1';
    if (grade.code === 1) return 'P2';
    return 'P3';
  }

  /**
   * Abstention rule. Any of these routes the case to a human instead of
   * publishing a grade: low confidence, borderline threshold, or evidence
   * disagreement between the attention map and the lesion branch.
   */
  evaluateAbstention({ confidence, referableProbability, gradcamRegions = [], lesions = [], qualityGrade }) {
    const t = this.config.clinical.abstentionConfidenceThreshold;
    const rt = this.config.clinical.referableProbabilityThreshold;

    if (qualityGrade === 'C') return { abstain: true, reason: 'UNGRADEABLE_IMAGE' };
    if (typeof confidence === 'number' && confidence < t) {
      return { abstain: true, reason: 'LOW_CONFIDENCE' };
    }
    if (typeof referableProbability === 'number' && Math.abs(referableProbability - rt) < 0.05) {
      return { abstain: true, reason: 'BORDERLINE_THRESHOLD' };
    }
    // Layer 1 highlights a region but Layer 2 finds no lesion anywhere: flag it.
    if (gradcamRegions.length > 0 && lesions.length === 0 && (referableProbability ?? 0) >= rt) {
      return { abstain: true, reason: 'EXPLANATION_DISAGREEMENT' };
    }
    return { abstain: false, reason: null };
  }

  /**
   * Random audit sample over auto-cleared cases. Without this, false negatives on
   * the low-grade path are invisible (Blueprint §06).
   */
  shouldAuditSample(referable) {
    if (referable) return false;
    return Math.random() < this.config.clinical.autoClearAuditSampleRate;
  }

  /** Human review is mandatory: no result may be finalised without a reviewer. */
  assertReviewRequired(consultation) {
    if (!this.config.clinical.mandatoryHumanReview) return true;
    if (consultation.status === 'closed' && !consultation.reviewer_id) {
      throw new ClinicalSafetyError(
        'A case cannot be closed without a recorded human review decision.',
        { consultationId: consultation.id },
      );
    }
    return true;
  }

  /** Standard result envelope every user-facing surface must carry. */
  resultEnvelope({ abstained, qualityGrade }) {
    return {
      disclaimer: MANDATORY_DISCLAIMER,
      isDiagnosis: false,
      humanReviewRequired: true,
      note: qualityGrade === 'C' ? QUALITY_REFUSAL_MESSAGE : (abstained ? ABSTENTION_MESSAGE : null),
    };
  }

  static get PROHIBITED_TERMS() { return PROHIBITED_TERMS; }
  static get MANDATORY_DISCLAIMER() { return MANDATORY_DISCLAIMER; }
}

module.exports = ClinicalSafetyService;
