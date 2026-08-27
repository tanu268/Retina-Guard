'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildTestContainer } = require('../helpers/buildTestContainer');
const { fakeJpegBuffer, createTechnician, createReviewer, registerPatient, createConsultation } = require('../helpers/factories');
const { ConflictError } = require('../../src/utils/errors');

function writeTempFile(buf) {
  const p = path.join(os.tmpdir(), `test-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
  fs.writeFileSync(p, buf);
  return p;
}

describe('ReviewerService — mandatory human adjudication', () => {
  let container; let tech; let reviewer; let consultation; let analysis;
  beforeEach(async () => {
    container = await buildTestContainer();
    tech = await createTechnician(container);
    reviewer = await createReviewer(container);
    const patient = await registerPatient(container, tech);
    consultation = await createConsultation(container, tech, patient.id);

    const tmp = writeTempFile(fakeJpegBuffer('review-flow'));
    const image = await container.services.imageService.upload({
      consultationId: consultation.id, laterality: 'left',
      file: { path: tmp, originalname: 'e.jpg', mimetype: 'image/jpeg' },
    }, tech, null);
    await container.repos.imageRepository.update(image.id, { quality_grade: 'A', status: 'quality_pass' });
    ({ analysis } = await container.services.analysisService.run({ imageId: image.id }, tech, null));
  });
  afterEach(async () => { await container.close(); });

  it('appears in the reviewer queue after analysis', async () => {
    const { items } = await container.services.reviewerService.queue({ limit: 20, offset: 0 });
    expect(items.some((i) => i.consultation_id === consultation.id)).toBe(true);
  });

  it('records a review decision and closes the loop on the consultation', async () => {
    const review = await container.services.reviewerService.decide(consultation.id, {
      reviewerGradeCode: 2, decision: 'refer', referralUrgency: 'within_1_week', notes: 'Concordant with AI grade.',
    }, reviewer, null);
    expect(review.reviewer_id).toBe(reviewer.id);

    const updated = await container.repos.consultationRepository.findById(consultation.id);
    expect(updated.status).toBe('review_complete');
    expect(updated.reviewer_id).toBe(reviewer.id);
  });

  it('refuses a second review for the same case', async () => {
    await container.services.reviewerService.decide(consultation.id, {
      reviewerGradeCode: 0, decision: 'routine_recall',
    }, reviewer, null);

    await expect(container.services.reviewerService.decide(consultation.id, {
      reviewerGradeCode: 1, decision: 'refer',
    }, reviewer, null)).rejects.toThrow(ConflictError);
  });

  it('rejects prohibited diagnostic language in reviewer notes', async () => {
    await expect(container.services.reviewerService.decide(consultation.id, {
      reviewerGradeCode: 0, decision: 'routine_recall', notes: 'Patient is diagnosed with normal retina.',
    }, reviewer, null)).rejects.toThrow(/Prohibited clinical language/);
  });

  it('computes agreement correctly against the AI grade', async () => {
    const review = await container.services.reviewerService.decide(consultation.id, {
      reviewerGradeCode: analysis.dr_grade_code ?? 0, decision: 'routine_recall',
    }, reviewer, null);
    if (analysis.dr_grade_code !== null && analysis.dr_grade_code !== undefined) {
      expect(review.agreement).toBe(true);
    }
  });
});
