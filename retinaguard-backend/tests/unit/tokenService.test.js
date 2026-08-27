'use strict';
const TokenService = require('../../src/services/tokenService');
const { UnauthorizedError } = require('../../src/utils/errors');

const config = {
  auth: {
    jwtSecret: 'test-access-secret', jwtRefreshSecret: 'test-refresh-secret',
    accessTtl: '1h', refreshTtl: '7d', issuer: 'retinaguard-test',
  },
};

describe('TokenService', () => {
  const svc = new TokenService({ config });
  const user = { id: 'u1', role: 'technician', full_name: 'Test User', facility_id: 'PHC-01' };

  it('signs and verifies an access token', () => {
    const token = svc.signAccessToken(user);
    const payload = svc.verifyAccessToken(token);
    expect(payload.sub).toBe('u1');
    expect(payload.role).toBe('technician');
  });

  it('rejects a refresh token presented as an access token', () => {
    const { token } = svc.issueRefreshToken(user);
    expect(() => svc.verifyAccessToken(token)).toThrow(UnauthorizedError);
  });

  it('issues a refresh token whose hash is stable for storage lookups', () => {
    const { token, tokenHash } = svc.issueRefreshToken(user);
    expect(svc.hashToken(token)).toBe(tokenHash);
  });

  it('rejects a tampered access token', () => {
    const token = svc.signAccessToken(user);
    expect(() => svc.verifyAccessToken(`${token}x`)).toThrow(UnauthorizedError);
  });
});
