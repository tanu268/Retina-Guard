'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { buildTestContainer } = require('../helpers/buildTestContainer');
const { fakeJpegBuffer, createTechnician, registerPatient, createConsultation } = require('../helpers/factories');

function writeTempFile(buf) {
  const p = path.join(os.tmpdir(), `test-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
  fs.writeFileSync(p, buf);
  return p;
}

/** Uploads an image and force-passes quality by patching the row directly (unit-level shortcut). */
async function uploadAndPassQuality(container, tech, consultationId, seed) {
  const tmp = writeTempFile(fakeJpegBuffer(seed));
  const image = await container.services.imageService.upload({
    consultationId, laterality: 'left', file: { path: tmp, originalname: 'e.jpg', mimetype: 'image/jpeg' },
  }, tech, null);
  // Deterministically force a Grade-A pass regardless of the mock's random draw, so this
  // test suite exercises the analysis path independently of the quality gate's own tests.
  await container.repos.imageRepository.update(image.id, { quality_grade: 'A', status: 'quality_pass' });
  return container.repos.imageRepository.findById(image.id);
}

describe('AnalysisService', () => {
  let container; let tech; let consultation;
  beforeEach(async () => {
    container = await buildTestContainer();
    tech = await createTechnician(container);
    const patient = await registerPatient(container, tech);
    consultation = await createConsultation(container, tech, patient.id);
  });
  afterEach(async () => { await container.close(); });

  it('refuses to analyse a Grade-C image', async () => {
    const tmp = writeTempFile(fakeJpegBuffer('c-grade'));
    const image = await container.services.imageService.upload({
      consultationId: consultation.id, laterality: 'left',
      file: { path: tmp, originalname: 'e.jpg', mimetype: 'image/jpeg' },
    }, tech, null);
    await container.repos.imageRepository.update(image.id, { quality_grade: 'C', status: 'quality_fail' });

    await expect(container.services.analysisService.run({ imageId: image.id }, tech, null))
      .rejects.toThrow(/graded C/);
  });

  it('persists a completed analysis with a valid ICDR grade and moves the case to awaiting_review', async () => {
    const image = await uploadAndPassQuality(container, tech, consultation.id, 'analysis-1');
    const { analysis, envelope } = await container.services.analysisService.run({ imageId: image.id }, tech, null);

    expect(['completed', 'abstained']).toContain(analysis.status);
    expect(envelope.isDiagnosis).toBe(false);
    expect(envelope.humanReviewRequired).toBe(true);

    const updatedConsultation = await container.repos.consultationRepository.findById(consultation.id);
    expect(updatedConsultation.status).toBe('awaiting_review');

    if (analysis.status === 'completed') {
      expect(analysis.dr_grade_code).toBeGreaterThanOrEqual(0);
      expect(analysis.dr_grade_code).toBeLessThanOrEqual(4);
      expect(analysis.grade_probabilities).toHaveLength(5);
      const explain = await container.services.analysisService.getExplainability(analysis.id);
      expect(explain.gradcam).toBeTruthy();
      expect(explain.lesion).toBeTruthy();
      expect(explain.anatomy).toBeTruthy();
    } else {
      expect(analysis.abstain_reason).toBeTruthy();
    }
  });

  it('marks the updated image status as analysed after a completed run', async () => {
    const image = await uploadAndPassQuality(container, tech, consultation.id, 'analysis-2');
    const { analysis } = await container.services.analysisService.run({ imageId: image.id }, tech, null);
    if (analysis.status === 'completed') {
      const refreshed = await container.repos.imageRepository.findById(image.id);
      expect(refreshed.status).toBe('analysed');
    }
  });

  it('every completed analysis carries measured stage timings for SimEvents', async () => {
    const image = await uploadAndPassQuality(container, tech, consultation.id, 'timing-check');
    const { analysis } = await container.services.analysisService.run({ imageId: image.id }, tech, null);
    expect(analysis.stage_timings_ms).toHaveProperty('total');
    expect(analysis.stage_timings_ms.total).toBeGreaterThanOrEqual(0);
  });
});
