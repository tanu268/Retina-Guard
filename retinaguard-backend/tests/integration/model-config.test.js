'use strict';
const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createTechnician } = require('../helpers/factories');

describe('Model Configuration Traceability', () => {
  let app; let container; let techToken;

  beforeEach(async () => {
    ({ app, container } = await buildTestApp());
    await createTechnician(container, { username: 'm_tech', password: 'Tech#Passw0rd1' });
    techToken = (await request(app).post('/auth/login').send({ username: 'm_tech', password: 'Tech#Passw0rd1' })).body.accessToken;
  });
  afterEach(async () => { await container.close(); });

  it('HARDEN-005: Model endpoint accurately reflects runtime configuration', async () => {

    // 2. Query model endpoint
    const res = await request(app).get('/api/v1/model').set('Authorization', `Bearer ${techToken}`);
    if (res.status === 404) {
      const res2 = await request(app).get('/model').set('Authorization', `Bearer ${techToken}`);
      expect(res2.status).toBe(200);
      expect(res2.body.model).toBeDefined();
      expect(res2.body.model.hash).toBe(container.config.matlab.modelHash);
      return;
    }
    
    // 3. Assert response
    // 3. Assert response
    expect(res.status).toBe(200);
    expect(res.body.model_hash).toBeDefined();
    
    // Assert model SHA/hash matches config or is reported correctly
    expect(res.body.model_hash).toBe(container.config.matlab.modelHash);
  });
});
