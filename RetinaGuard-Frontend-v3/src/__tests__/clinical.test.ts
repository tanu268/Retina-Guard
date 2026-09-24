import { describe, it, expect } from 'vitest';
import { gradeByCode, lintClinicalText, ABSTAIN_REASONS } from '../lib/clinical';
import type { AbstainReason } from '../types';

describe('gradeByCode', () => {
  it('returns Grade 0 definition for code 0', () => {
    const g = gradeByCode(0);
    expect(g).not.toBeNull();
    expect(g!.label).toBe('No Apparent DR');
    expect(g!.referable).toBe(false);
  });

  it('returns Grade 2 as referable', () => {
    const g = gradeByCode(2);
    expect(g!.referable).toBe(true);
  });

  it('returns Grade 4 as referable', () => {
    const g = gradeByCode(4);
    expect(g!.referable).toBe(true);
  });

  // CRITICAL: null must not be mapped to Grade 0 (abstention case)
  it('returns null for null code (abstention)', () => {
    expect(gradeByCode(null)).toBeNull();
  });

  it('returns null for undefined code', () => {
    expect(gradeByCode(undefined)).toBeNull();
  });

  it('returns null for unknown code (e.g. 99)', () => {
    // @ts-expect-error intentional invalid input
    expect(gradeByCode(99)).toBeNull();
  });
});

describe('lintClinicalText', () => {
  it('flags "diagnosis" as a prohibited term', () => {
    const violations = lintClinicalText('This is a diagnosis.');
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].term).toBe('diagnosis');
    expect(violations[0].suggestion).toBe('screening result');
  });

  it('flags "normal" as a prohibited term', () => {
    const violations = lintClinicalText('The eye looks normal.');
    expect(violations.some((v) => v.term === 'normal')).toBe(true);
  });

  it('does not flag clean clinical language', () => {
    const violations = lintClinicalText('No apparent DR findings in this screening.');
    expect(violations).toHaveLength(0);
  });

  it('is case-insensitive', () => {
    const violations = lintClinicalText('This is a DIAGNOSIS.');
    expect(violations.length).toBeGreaterThan(0);
  });

  it('returns empty array for null input', () => {
    expect(lintClinicalText(null)).toHaveLength(0);
  });

  it('returns empty array for empty string', () => {
    expect(lintClinicalText('')).toHaveLength(0);
  });
});

describe('ABSTAIN_REASONS', () => {
  const reasons: AbstainReason[] = [
    'LOW_CONFIDENCE', 'UNGRADEABLE_IMAGE', 'EXPLANATION_DISAGREEMENT',
    'STAGE_FAILURE', 'BORDERLINE_THRESHOLD',
  ];

  it.each(reasons)('has a label and guidance string for %s', (reason) => {
    const entry = ABSTAIN_REASONS[reason];
    expect(entry).toBeDefined();
    expect(typeof entry.label).toBe('string');
    expect(entry.label.length).toBeGreaterThan(0);
    expect(typeof entry.guidance).toBe('string');
    expect(entry.guidance.length).toBeGreaterThan(0);
  });
});
