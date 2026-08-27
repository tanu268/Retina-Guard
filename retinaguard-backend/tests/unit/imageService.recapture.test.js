'use strict';
const { buildTestContainer } = require('../helpers/buildTestContainer');
const { fakeJpegBuffer, createTechnician, registerPatient, createConsultation } = require('../helpers/factories');
const { ClinicalSafetyError } = require('../../src/utils/errors');
const fs = require('fs');
const os = require('os');
const path = require('path');

function writeTempFile(buf) {
  const p = path.join(os.tmpdir(), `test-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
  fs.writeFileSync(p, buf);
  return p;
}

describe('ImageService — recapture ceiling', () => {
  let container; let tech; let consultation;
  beforeEach(async () => {
    container = await buildTestContainer();
    tech = await createTechnician(container);
    const patient = await registerPatient(container, tech);
    consultation = await createConsultation(container, tech, patient.id);
  });
  afterEach(async () => { await container.close(); });

  it('allows uploads up to the configured recapture ceiling', async () => {
    const maxAttempts = container.config.clinical.maxRecaptureAttempts;
    for (let i = 0; i <= maxAttempts; i += 1) {
      const tmp = writeTempFile(fakeJpegBuffer(`attempt-${i}`));
      const image = await container.services.imageService.upload({
        consultationId: consultation.id, laterality: 'left',
        file: { path: tmp, originalname: 'eye.jpg', mimetype: 'image/jpeg' },
      }, tech, null);
      expect(image.capture_attempt).toBe(i + 1);
    }
  });

  it('refuses an upload beyond the recapture ceiling with a ClinicalSafetyError', async () => {
    const maxAttempts = container.config.clinical.maxRecaptureAttempts;
    for (let i = 0; i <= maxAttempts; i += 1) {
      const tmp = writeTempFile(fakeJpegBuffer(`a-${i}`));
      await container.services.imageService.upload({
        consultationId: consultation.id, laterality: 'right',
        file: { path: tmp, originalname: 'eye.jpg', mimetype: 'image/jpeg' },
      }, tech, null);
    }
    const tmp = writeTempFile(fakeJpegBuffer('one-too-many'));
    await expect(container.services.imageService.upload({
      consultationId: consultation.id, laterality: 'right',
      file: { path: tmp, originalname: 'eye.jpg', mimetype: 'image/jpeg' },
    }, tech, null)).rejects.toThrow(ClinicalSafetyError);
  });

  it('rejects an unsupported mime type', async () => {
    const tmp = writeTempFile(Buffer.from('not an image'));
    await expect(container.services.imageService.upload({
      consultationId: consultation.id, laterality: 'left',
      file: { path: tmp, originalname: 'eye.gif', mimetype: 'image/gif' },
    }, tech, null)).rejects.toThrow();
  });
});
