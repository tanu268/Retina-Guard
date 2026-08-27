'use strict';
const config = require('../config');
const {
  PRIORITY, REFERABLE_MIN_GRADE, ANALYSIS_STATUS, DR_GRADE_BY_CODE,
} = require('../config/constants');

/**
 * Turns a raw model output into a clinically safe triage decision.
 *
 * Two rules from the blueprint drive everything here:
 *   1. An uncertain output must never silently become a clinical decision —
 *      it abstains and routes to a human.
 *   2. Ordering is severity-first so an urgent case cannot sit behind routine
 *      ones in the reviewer queue.
 *
 * Thresholds are ASSUMPTION-tier values from configuration. They are operating
 * points to be re-derived under the ≥90% sensitivity constraint once real
 * validation data exists; they are not measured results.
 */
class TriageService {
  constructor({ clinical = config.clinical } = {}) { this.clinical = clinical; }

  /**
   * @param {object} grade    GradeResult from matlabService
   * @param {object} [signals] { qualityGrade, disagreementFlag, warnings }
   */
  evaluate(grade, signals = {}) {
    const warnings = [...(signals.warnings || [])];
    const reasons = [];

    let abstained = false;
    let abstainReason = null;

    if (grade.confidence < this.clinical.abstainConfidenceThreshold) {
      abstained = true;
      abstainReason = 'LOW_CONFIDENCE';
      reasons.push(
        `Calibrated confidence ${grade.confidence} is below the abstention threshold ` +
        `${this.clinical.abstainConfidenceThreshold}; routed to human review without a suggested grade.`);
    }
    if (signals.qualityGrade === 'B' && grade.confidence < this.clinical.abstainConfidenceThreshold + 0.1) {
      reasons.push('Borderline image quality combined with modest confidence.');
    }
    if (signals.disagreementFlag) {
      reasons.push('Attention map and lesion evidence disagree.');
    }

    const referable = grade.referableProbability >= this.clinical.referableProbabilityThreshold
      || grade.drGradeCode >= REFERABLE_MIN_GRADE;

    const priority = TriageService.priorityFor({
      gradeCode: grade.drGradeCode,
      abstained,
      referable,
      disagreementFlag: Boolean(signals.disagreementFlag),
    });

    return {
      abstained,
      abstainReason,
      referable: abstained ? null : referable,
      priority,
      status: abstained ? ANALYSIS_STATUS.ABSTAINED : ANALYSIS_STATUS.COMPLETED,
      reasons,
      warnings,
      // Every case reaches a human in the MVP; auto-clear stays off by default.
      requiresHumanReview: true,
      autoClearEligible: this.clinical.autoClearEnabled && !abstained && !referable,
      auditSampled: this.clinical.autoClearEnabled
        ? Math.random() < this.clinical.autoClearAuditSampleRate
        : false,
    };
  }

  static priorityFor({ gradeCode, abstained, referable, disagreementFlag }) {
    if (gradeCode === 4 || gradeCode === 3) return PRIORITY.P0;   // urgent sight-threatening pattern
    if (abstained || disagreementFlag) return PRIORITY.P2;        // uncertain → human, but not urgent
    if (referable) return PRIORITY.P1;
    return PRIORITY.P3;
  }

  /** Plain-language, non-diagnostic summary for the technician and the report. */
  static narrate({ gradeCode, abstained, referable, priority }) {
    if (abstained) {
      return 'The screening model did not reach sufficient confidence on this image. '
        + 'No suggested grade is shown. A human reviewer will assess the case.';
    }
    const label = DR_GRADE_BY_CODE[gradeCode]?.label || 'Undetermined';
    const urgency = {
      [PRIORITY.P0]: 'flagged for urgent review',
      [PRIORITY.P1]: 'flagged for referral review',
      [PRIORITY.P2]: 'flagged for careful review',
      [PRIORITY.P3]: 'queued for routine confirmatory review',
    }[priority];
    return `AI-assisted screening suggests ${label}${referable ? ' (referable pattern)' : ''}; ${urgency}. `
      + 'A human reviewer issues the final screening decision.';
  }
}

module.exports = TriageService;
