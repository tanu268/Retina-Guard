'use strict';
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { UnauthorizedError } = require('../utils/errors');
const { sha256 } = require('../utils/hash');

class TokenService {
  constructor({ config }) { this.cfg = config.auth; }

  signAccessToken(user) {
    return jwt.sign(
      {
        sub: user.id,
        role: user.role,
        name: user.full_name,
        facility: user.facility_id || null,
        typ: 'access',
      },
      this.cfg.jwtSecret,
      { expiresIn: this.cfg.accessTtl, issuer: this.cfg.issuer },
    );
  }

  /** The raw refresh token is returned to the client; only its digest is stored. */
  issueRefreshToken(user) {
    const raw = crypto.randomBytes(48).toString('base64url');
    const token = jwt.sign(
      { sub: user.id, jti: raw, typ: 'refresh' },
      this.cfg.jwtRefreshSecret,
      { expiresIn: this.cfg.refreshTtl, issuer: this.cfg.issuer },
    );
    return { token, tokenHash: sha256(token) };
  }

  verifyAccessToken(token) {
    try {
      const payload = jwt.verify(token, this.cfg.jwtSecret, { issuer: this.cfg.issuer });
      if (payload.typ !== 'access') throw new Error('wrong token type');
      return payload;
    } catch (err) {
      throw new UnauthorizedError(
        err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token',
      );
    }
  }

  verifyRefreshToken(token) {
    try {
      const payload = jwt.verify(token, this.cfg.jwtRefreshSecret, { issuer: this.cfg.issuer });
      if (payload.typ !== 'refresh') throw new Error('wrong token type');
      return payload;
    } catch (err) {
      throw new UnauthorizedError(
        err.name === 'TokenExpiredError' ? 'Refresh token expired' : 'Invalid refresh token',
      );
    }
  }

  hashToken(token) { return sha256(token); }

  refreshExpiryIso() {
    const ttl = String(this.cfg.refreshTtl);
    const m = ttl.match(/^(\d+)([smhd])$/);
    const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const ms = m ? Number(m[1]) * mult[m[2]] : 7 * 86400000;
    return new Date(Date.now() + ms).toISOString();
  }
}

module.exports = TokenService;
