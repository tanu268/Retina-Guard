'use strict';
const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createTechnician, createReviewer, fakeJpegBuffer } = require('../helpers/factories');

describe('Concurrency and Idempotency', () => {
  let app; let container; let techToken; let reviewerToken;

  beforeEach(async () => {
    ({ app, container } = await buildTestApp());
    await createTechnician(container, { username: 'c_tech', password: 'Tech#Passw0rd1' });
    await createReviewer(container, { username: 'c_rev', password: 'Review#Passw0rd1' });
    techToken = (await request(app).post('/auth/login').send({ username: 'c_tech', password: 'Tech#Passw0rd1' })).body.accessToken;
    reviewerToken = (await request(app).post('/auth/login').send({ username: 'c_rev', password: 'Review#Passw0rd1' })).body.accessToken;
  });
  afterEach(async () => { await container.close(); });

  it('GAP-004: Race-safe review idempotency via DB unique constraint', async () => {
    // 1. Setup a case
    const patientRes = await request(app).post('/patients').set('Authorization', `Bearer ${techToken}`).send({ fullName: 'Idempotency Test' });
    const consultRes = await request(app).post('/consultations').set('Authorization', `Bearer ${techToken}`).send({ patientId: patientRes.body.patient.id, identityConfirmed: true });
    const consultationId = consultRes.body.consultation.id;

    const uploadRes = await request(app).post('/images/upload').set('Authorization', `Bearer ${techToken}`).field('consultationId', consultationId).field('laterality', 'left').attach('image', fakeJpegBuffer('test'), 'eye.jpg');
    if (uploadRes.body.image.quality_grade === 'C') {
      await container.repos.imageRepository.update(uploadRes.body.image.id, { quality_grade: 'A', status: 'quality_pass' });
    }
    await request(app).post('/analysis/run').set('Authorization', `Bearer ${techToken}`).send({ imageId: uploadRes.body.image.id });

    // 2. Submit review first time
    const decideRes1 = await request(app).post(`/review/${consultationId}/decision`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ reviewerGradeCode: 0, decision: 'routine_recall' });
    expect(decideRes1.status).toBe(201);

    // 3. Submit identical review again
    const decideRes2 = await request(app).post(`/review/${consultationId}/decision`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ reviewerGradeCode: 0, decision: 'routine_recall' });
    
    // Expect 409 Conflict due to state transition rejection or unique constraint
    expect(decideRes2.status).toBe(409);
  });
});
