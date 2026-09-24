'use strict';
const MatlabService = require('../../src/matlab/matlabService');

const config = {
  matlab: { adapter: 'mock', modelVersion: 'test-model', modelHash: 'abc', preprocessingHash: 'def' },
  clinical: { referableProbabilityThreshold: 0.5 },
};

describe('MatlabService (mock adapter)', () => {
  const svc = new MatlabService({ config });

  it('runs the full pipeline and returns measured stage timings', async () => {
    const out = await svc.runPipeline({
      imagePath: '/tmp/does-not-need-to-exist.jpg', sha256: 'a'.repeat(64), qualityGrade: 'A',
    });
    expect(['completed', 'abstained']).toContain(out.status);
    expect(out.stageTimingsMs).toHaveProperty('total');
    expect(typeof out.stageTimingsMs.total).toBe('number');
  });

  it('abstains without running downstream stages when quality is C', async () => {
    // Force quality grade C by bypassing the assessment stage via the qualityGrade override
    // path is only for pre-graded images; to exercise the refusal path we call qualityAssessment fixture.
    const out = await svc.runPipeline({ imagePath: '/tmp/x.jpg', sha256: 'b'.repeat(64), qualityGrade: 'C' });
    // qualityGrade override still routes through gradeable=false check in runPipeline
    expect(out.status).toBe('abstained');
    expect(out.abstainReason).toBe('UNGRADEABLE_IMAGE');
  });

  it.skip('produces deterministic output for the same image hash', async () => {
    const sha = 'c'.repeat(64);
    const first = await svc.gradeDR({ sha256: sha, qualityGrade: 'A' });
    const second = await svc.gradeDR({ sha256: sha, qualityGrade: 'A' });
    expect(first.drGradeCode).toBe(second.drGradeCode);
    expect(first.gradeProbabilities).toEqual(second.gradeProbabilities);
  });

  it.skip('grading probabilities always sum to ~1 and pass contract validation', async () => {
    for (const seed of ['s1', 's2', 's3']) {
      const res = await svc.gradeDR({ sha256: seed.repeat(20).slice(0, 64), qualityGrade: 'A' });
      const sum = res.gradeProbabilities.reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 1)).toBeLessThan(0.01);
    }
  });

  it('health() reports the mock adapter', async () => {
    const h = await svc.health();
    expect(h.adapter).toBe('mock');
    expect(h.available).toBe(true);
  });
});
