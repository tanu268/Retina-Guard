'use strict';
const { assertGradingResponse, assertQualityResponse, gradeByCode, gradeByLabel } = require('../../src/matlab/contracts');

describe('MATLAB contracts', () => {
  describe('assertGradingResponse', () => {
    const valid = {
      drGradeCode: 2, gradeProbabilities: [0.1, 0.1, 0.6, 0.1, 0.1],
      confidence: 0.6, referableProbability: 0.8, modelVersion: 'v1',
    };
    it('accepts a well-formed response', () => {
      expect(assertGradingResponse(valid)).toEqual([]);
    });
    it('rejects a probability vector that does not sum to 1', () => {
      const bad = { ...valid, gradeProbabilities: [0.5, 0.5, 0.5, 0.5, 0.5] };
      expect(assertGradingResponse(bad).some((e) => e.includes('sum to 1'))).toBe(true);
    });
    it('rejects an out-of-range grade code', () => {
      expect(assertGradingResponse({ ...valid, drGradeCode: 9 }).length).toBeGreaterThan(0);
    });
    it('rejects missing modelVersion', () => {
      const { modelVersion, ...rest } = valid;
      expect(assertGradingResponse(rest).some((e) => e.includes('modelVersion'))).toBe(true);
    });
    it('rejects a non-object', () => {
      expect(assertGradingResponse(null).length).toBeGreaterThan(0);
    });
  });

  describe('assertQualityResponse', () => {
    it('accepts A/B/C grades', () => {
      expect(assertQualityResponse({ qualityGrade: 'A', qualityScore: 0.9, reasons: [] })).toEqual([]);
    });
    it('rejects an invalid grade letter', () => {
      expect(assertQualityResponse({ qualityGrade: 'D', qualityScore: 0.9, reasons: [] }).length).toBeGreaterThan(0);
    });
  });

  describe('grade lookups', () => {
    it('gradeByCode resolves ICDR labels', () => {
      expect(gradeByCode(0).label).toBe('No Apparent DR');
      expect(gradeByCode(4).label).toBe('PDR');
      expect(gradeByCode(4).referable).toBe(true);
      expect(gradeByCode(0).referable).toBe(false);
    });
    it('gradeByLabel is the inverse of gradeByCode', () => {
      expect(gradeByLabel('Moderate NPDR').code).toBe(2);
    });
    it('returns null for unknown codes', () => {
      expect(gradeByCode(99)).toBeNull();
    });
  });
});
