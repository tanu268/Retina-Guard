'use strict';
const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createTechnician, createReviewer, fakeJpegBuffer } = require('../helpers/factories');

/**
 * Full clinical loop, exercised as HTTP calls end-to-end:
 * register patient → create consultation → upload+quality gate → run AI →
 * mandatory human review → generate report.
 * Mirrors the sequence diagram segments 2–5.
 */
describe('End-to-end screening pipeline (HTTP)', () => {
  let app; let container; let techToken; let reviewerToken;

  beforeEach(async () => {
    ({ app, container } = await buildTestApp());
    await createTechnician(container, { username: 'e2e_tech', password: 'Tech#Passw0rd1' });
    await createReviewer(container, { username: 'e2e_rev', password: 'Review#Passw0rd1' });
    techToken = (await request(app).post('/auth/login').send({ username: 'e2e_tech', password: 'Tech#Passw0rd1' })).body.accessToken;
    reviewerToken = (await request(app).post('/auth/login').send({ username: 'e2e_rev', password: 'Review#Passw0rd1' })).body.accessToken;
  });
  afterEach(async () => { await container.close(); });

  it('completes the full case lifecycle and generates a report', async () => {
    const patientRes = await request(app).post('/patients')
      .set('Authorization', `Bearer ${techToken}`)
      .send({ fullName: 'Sunita Devi', age: 58, gender: 'female', village: 'Mhow', district: 'Indore', diabetesType: 'type2' });
    expect(patientRes.status).toBe(201);
    const patientId = patientRes.body.patient.id;

    const consultRes = await request(app).post('/consultations')
      .set('Authorization', `Bearer ${techToken}`)
      .send({ patientId, identityConfirmed: true });
    expect(consultRes.status).toBe(201);
    const consultationId = consultRes.body.consultation.id;

    const uploadRes = await request(app).post('/images/upload')
      .set('Authorization', `Bearer ${techToken}`)
      .field('consultationId', consultationId)
      .field('laterality', 'left')
      .attach('image', fakeJpegBuffer('e2e-eye'), 'eye.jpg');
    expect(uploadRes.status).toBe(201);
    expect(['A', 'B', 'C']).toContain(uploadRes.body.image.quality_grade);

    if (uploadRes.body.image.quality_grade === 'C') {
      // Deterministic mock occasionally draws C; force-pass to keep the E2E flow deterministic here
      // (the quality-gate refusal path itself is covered in imageService.recapture.test.js).
      await container.repos.imageRepository.update(uploadRes.body.image.id, { quality_grade: 'A', status: 'quality_pass' });
    }

    const runRes = await request(app).post('/analysis/run')
      .set('Authorization', `Bearer ${techToken}`)
      .send({ imageId: uploadRes.body.image.id });
    expect(runRes.status).toBe(201);
    expect(runRes.body.isDiagnosis).toBe(false);
    expect(runRes.body.humanReviewRequired).toBe(true);

    const decideRes = await request(app).post(`/review/${consultationId}/decision`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ reviewerGradeCode: runRes.body.analysis.dr_grade_code ?? 0, decision: 'routine_recall' });
    expect(decideRes.status).toBe(201);

    const reportRes = await request(app).post(`/reports/${consultationId}/generate`)
      .set('Authorization', `Bearer ${techToken}`);
    if (reportRes.status !== 201) console.error("REPORT GENERATE FAIL:", reportRes.body);
    expect(reportRes.status).toBe(201);

    const jsonRes = await request(app).get(`/reports/${consultationId}/json`).set('Authorization', `Bearer ${techToken}`);
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.body.report.status).toBe('final');

    const pdfRes = await request(app).get(`/reports/${consultationId}/pdf`).set('Authorization', `Bearer ${techToken}`);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');

    const auditRes = await request(app).get(`/audit/${consultationId}`).set('Authorization', `Bearer ${reviewerToken}`);
    if (auditRes.status !== 200) {
      console.log('AUDIT ERROR:', auditRes.body);
    }
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.entries.length).toBeGreaterThan(0);
  });

  it('refuses to close a case without a reviewer decision', async () => {
    const patientRes = await request(app).post('/patients').set('Authorization', `Bearer ${techToken}`).send({ fullName: 'No Review' });
    const consultRes = await request(app).post('/consultations').set('Authorization', `Bearer ${techToken}`)
      .send({ patientId: patientRes.body.patient.id, identityConfirmed: true });

    const res = await request(app).patch(`/consultations/${consultRes.body.consultation.id}`)
      .set('Authorization', `Bearer ${techToken}`).send({ status: 'closed' });
    expect(res.status).toBe(409);
  });

  it('refuses to create a consultation without identity confirmation', async () => {
    const patientRes = await request(app).post('/patients').set('Authorization', `Bearer ${techToken}`).send({ fullName: 'Unconfirmed' });
    const res = await request(app).post('/consultations').set('Authorization', `Bearer ${techToken}`)
      .send({ patientId: patientRes.body.patient.id, identityConfirmed: false });
    expect(res.status).toBe(409);
  });
});
