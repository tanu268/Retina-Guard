'use strict';
const request = require('supertest');
const { buildTestApp } = require('../helpers/app');
const { createTechnician } = require('../helpers/factories');

describe('POST /auth/login, /auth/refresh, /auth/logout', () => {
  let app; let container;
  beforeEach(async () => { ({ app, container } = await buildTestApp()); });
  afterEach(async () => { await container.close(); });

  it('logs in with valid credentials and returns tokens', async () => {
    await createTechnician(container, { username: 'tech1', password: 'Tech#Passw0rd1' });
    const res = await request(app).post('/auth/login').send({ username: 'tech1', password: 'Tech#Passw0rd1' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.user.role).toBe('technician');
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('rejects invalid credentials with 401', async () => {
    await createTechnician(container, { username: 'tech2', password: 'Tech#Passw0rd1' });
    const res = await request(app).post('/auth/login').send({ username: 'tech2', password: 'WrongPass1' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('validates the login payload shape', async () => {
    const res = await request(app).post('/auth/login').send({ username: '' });
    expect(res.status).toBe(422);
  });

  it('rotates the refresh token and rejects reuse of the old one', async () => {
    await createTechnician(container, { username: 'tech3', password: 'Tech#Passw0rd1' });
    const login = await request(app).post('/auth/login').send({ username: 'tech3', password: 'Tech#Passw0rd1' });
    const refreshed = await request(app).post('/auth/refresh').send({ refreshToken: login.body.refreshToken });
    if (refreshed.status !== 200) console.error("AUTH REFRESH FAIL:", refreshed.body);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.refreshToken).not.toBe(login.body.refreshToken);

    const reused = await request(app).post('/auth/refresh').send({ refreshToken: login.body.refreshToken });
    expect(reused.status).toBe(401);
  });

  it('rejects /auth/me without a bearer token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user with a valid bearer token', async () => {
    await createTechnician(container, { username: 'tech4', password: 'Tech#Passw0rd1' });
    const login = await request(app).post('/auth/login').send({ username: 'tech4', password: 'Tech#Passw0rd1' });
    const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe('tech4');
  });

  it('locks the account after repeated failed logins', async () => {
    await createTechnician(container, { username: 'tech5', password: 'Tech#Passw0rd1' });
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/auth/login').send({ username: 'tech5', password: 'wrong' });
    }
    const res = await request(app).post('/auth/login').send({ username: 'tech5', password: 'Tech#Passw0rd1' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/locked/i);
  });
});
