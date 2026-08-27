'use strict';
const ClinicalSafetyService = require('../../src/services/clinicalSafetyService');
const { ClinicalSafetyError } = require('../../src/utils/errors');

const config = {
  clinical: {
    abstentionConfidenceThreshold: 0.7,
    referableProbabilityThreshold: 0.5,
    autoClearAuditSampleRate: 0,
    mandatoryHumanReview: true,
  },
};

describe('ClinicalSafetyService', () => {
  const svc = new ClinicalSafetyService({ config });

  describe('language linting', () => {
    it('flags prohibited diagnostic language', () => {
      const violations = svc.lint('This confirms a diagnosis of normal retina.');
      expect(violations.map((v) => v.term)).toEqual(expect.arrayContaining(['diagnosis', 'normal']));
    });

    it('passes screening-safe language', () => {
      expect(svc.lint('AI-assisted screening found no apparent DR findings.')).toHaveLength(0);
    });

    it('throws ClinicalSafetyError via assertSafeLanguage', () => {
      expect(() => svc.assertSafeLanguage('Patient is diagnosed with DR', 'notes')).toThrow(ClinicalSafetyError);
    });

    it('allows empty/undefined text', () => {
      expect(() => svc.assertSafeLanguage(undefined, 'notes')).not.toThrow();
    });
  });

  describe('triagePriority', () => {
    it('grade C quality is P1', () => {
      expect(svc.triagePriority({ qualityGrade: 'C' })).toBe('P1');
    });
    it('abstention is P1', () => {
      expect(svc.triagePriority({ abstained: true })).toBe('P1');
    });
    it('severe/PDR (grade 3,4) is P0', () => {
      expect(svc.triagePriority({ drGradeCode: 3 })).toBe('P0');
      expect(svc.triagePriority({ drGradeCode: 4 })).toBe('P0');
    });
    it('moderate NPDR (grade 2) is P1', () => {
      expect(svc.triagePriority({ drGradeCode: 2 })).toBe('P1');
    });
    it('mild NPDR (grade 1) is P2', () => {
      expect(svc.triagePriority({ drGradeCode: 1 })).toBe('P2');
    });
    it('no apparent DR (grade 0) is P3', () => {
      expect(svc.triagePriority({ drGradeCode: 0 })).toBe('P3');
    });
  });

  describe('evaluateAbstention', () => {
    it('abstains on grade-C quality', () => {
      expect(svc.evaluateAbstention({ qualityGrade: 'C' })).toEqual({ abstain: true, reason: 'UNGRADEABLE_IMAGE' });
    });
    it('abstains on low confidence', () => {
      const r = svc.evaluateAbstention({ confidence: 0.5, referableProbability: 0.1, qualityGrade: 'A' });
      expect(r).toEqual({ abstain: true, reason: 'LOW_CONFIDENCE' });
    });
    it('abstains near the referable threshold (borderline band)', () => {
      const r = svc.evaluateAbstention({ confidence: 0.9, referableProbability: 0.52, qualityGrade: 'A' });
      expect(r).toEqual({ abstain: true, reason: 'BORDERLINE_THRESHOLD' });
    });
    it('abstains when Grad-CAM highlights a region but no lesion is found and referable', () => {
      const r = svc.evaluateAbstention({
        confidence: 0.9, referableProbability: 0.9, qualityGrade: 'A',
        gradcamRegions: [{ x: 0.1, y: 0.1 }], lesions: [],
      });
      expect(r).toEqual({ abstain: true, reason: 'EXPLANATION_DISAGREEMENT' });
    });
    it('does not abstain on a confident, consistent, non-borderline result', () => {
      const r = svc.evaluateAbstention({
        confidence: 0.95, referableProbability: 0.05, qualityGrade: 'A',
        gradcamRegions: [], lesions: [],
      });
      expect(r).toEqual({ abstain: false, reason: null });
    });
  });

  describe('assertReviewRequired', () => {
    it('throws when closing without a reviewer', () => {
      expect(() => svc.assertReviewRequired({ status: 'closed', reviewer_id: null })).toThrow(ClinicalSafetyError);
    });
    it('passes when closed with a reviewer', () => {
      expect(() => svc.assertReviewRequired({ status: 'closed', reviewer_id: 'u1' })).not.toThrow();
    });
  });

  describe('resultEnvelope', () => {
    it('always marks isDiagnosis false and humanReviewRequired true', () => {
      const env = svc.resultEnvelope({ abstained: false, qualityGrade: 'A' });
      expect(env.isDiagnosis).toBe(false);
      expect(env.humanReviewRequired).toBe(true);
      expect(env.disclaimer).toMatch(/Not a diagnosis/);
    });
  });
});
