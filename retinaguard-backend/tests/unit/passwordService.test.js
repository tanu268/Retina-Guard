'use strict';
const PasswordService = require('../../src/services/passwordService');

describe('PasswordService', () => {
  const svc = new PasswordService({ config: { auth: { bcryptRounds: 4 } } });

  it('hashes and verifies a password', async () => {
    const hash = await svc.hash('Sup3rSecret!');
    expect(await svc.compare('Sup3rSecret!', hash)).toBe(true);
    expect(await svc.compare('WrongPass1', hash)).toBe(false);
  });

  it('rejects weak passwords', () => {
    expect(svc.validateStrength('short').valid).toBe(false);
    expect(svc.validateStrength('alllowercase123').valid).toBe(false);
    expect(svc.validateStrength('password123').valid).toBe(false);
  });

  it('accepts a strong password', () => {
    expect(svc.validateStrength('Str0ngPassw0rd!').valid).toBe(true);
  });
});
