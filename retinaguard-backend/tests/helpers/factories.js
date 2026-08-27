'use strict';
const crypto = require('crypto');

/** Deterministic-ish fake fundus image bytes with a real-looking JPEG magic number. */
function fakeJpegBuffer(seed = 'x') {
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const body = crypto.createHash('sha256').update(seed).digest();
  const footer = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([header, body, footer]);
}

async function createTechnician(container, overrides = {}) {
  return container.services.authService.createUser({
    username: overrides.username || `tech_${crypto.randomBytes(3).toString('hex')}`,
    password: 'Tech#Passw0rd1',
    fullName: 'Test Technician',
    role: 'technician',
    facilityId: 'PHC-TEST-01',
    ...overrides,
  }, { id: 'system', role: 'admin' }, null);
}

async function createReviewer(container, overrides = {}) {
  return container.services.authService.createUser({
    username: overrides.username || `rev_${crypto.randomBytes(3).toString('hex')}`,
    password: 'Review#Passw0rd1',
    fullName: 'Test Reviewer',
    role: 'reviewer',
    registrationNo: 'MCI-TEST-0001',
    ...overrides,
  }, { id: 'system', role: 'admin' }, null);
}

async function createAdmin(container, overrides = {}) {
  return container.services.authService.createUser({
    username: overrides.username || `admin_${crypto.randomBytes(3).toString('hex')}`,
    password: 'Admin#Passw0rd1',
    fullName: 'Test Admin',
    role: 'admin',
    ...overrides,
  }, { id: 'system', role: 'admin' }, null);
}

async function registerPatient(container, actor, overrides = {}) {
  const { patient } = await container.services.patientService.register({
    fullName: 'Ramesh Kumar', age: 54, gender: 'male', village: 'Depalpur', district: 'Indore',
    diabetesType: 'type2', diabetesDurationYears: 8,
    ...overrides,
  }, actor, null);
  return patient;
}

async function createConsultation(container, actor, patientId, overrides = {}) {
  return container.services.consultationService.create({
    patientId, identityConfirmed: true, ...overrides,
  }, actor, null);
}

module.exports = {
  fakeJpegBuffer, createTechnician, createReviewer, createAdmin, registerPatient, createConsultation,
};
