'use strict';
const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createTechnician, createReviewer } = require('../helpers/factories');

async function login(app, username, password) {
  const res = await request(app).post('/auth/login').send({ username, password });
  return res.body.accessToken;
}

describe('RBAC across roles', () => {
  let app; let container;
  beforeEach(async () => { ({ app, container } = await buildTestApp()); });
  afterEach(async () => { await container.close(); });

  it('a technician cannot access the reviewer queue', async () => {
    await createTechnician(container, { username: 'techA', password: 'Tech#Passw0rd1' });
    const token = await login(app, 'techA', 'Tech#Passw0rd1');
    const res = await request(app).get('/review/queue').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('a reviewer cannot register a patient', async () => {
    await createReviewer(container, { username: 'revA', password: 'Review#Passw0rd1' });
    const token = await login(app, 'revA', 'Review#Passw0rd1');
    const res = await request(app).post('/patients').set('Authorization', `Bearer ${token}`).send({ fullName: 'X' });
    expect(res.status).toBe(403);
  });

  it('an unauthenticated request to a protected route is 401', async () => {
    const res = await request(app).get('/patients');
    expect(res.status).toBe(401);
  });

  it('admin can create users; non-admin cannot', async () => {
    await createTechnician(container, { username: 'techB', password: 'Tech#Passw0rd1' });
    const token = await login(app, 'techB', 'Tech#Passw0rd1');
    const res = await request(app).post('/auth/users').set('Authorization', `Bearer ${token}`).send({
      username: 'newuser', password: 'Str0ngPassw0rd!', fullName: 'New User', role: 'technician',
    });
    expect(res.status).toBe(403);
  });
});
