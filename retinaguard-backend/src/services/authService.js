'use strict';
const { UnauthorizedError, ForbiddenError, ConflictError, ValidationError } = require('../utils/errors');
const { uuid } = require('../utils/ids');
const AuditService = require('./auditService');

/**
 * Auth is deliberately simple: JWT access token + rotating refresh token, both
 * usable offline once issued. Bounded offline capability (Blueprint §08) means
 * a stale-but-unexpired access token still works at a PHC with no signal; it
 * does not mean unlimited offline identity.
 */
class AuthService {
  constructor({ userRepository, refreshTokenRepository, passwordService, tokenService, auditService, config }) {
    this.users = userRepository;
    this.refreshTokens = refreshTokenRepository;
    this.password = passwordService;
    this.tokens = tokenService;
    this.audit = auditService;
    this.config = config;
  }

  async login({ username, password }, req) {
    const user = await this.users.findByUsername(username);
    if (!user || !user.is_active) {
      await this.audit.record({ action: AuditService.ACTIONS.LOGIN_FAILURE, entityType: 'user', req,
        after: { username, reason: 'not_found_or_inactive' } });
      throw new UnauthorizedError('Invalid username or password');
    }
    if (this.users.isLocked(user)) {
      throw new UnauthorizedError('Account temporarily locked after repeated failed attempts. Try again later.');
    }

    const ok = await this.password.compare(password, user.password_hash);
    if (!ok) {
      const { lockedUntil } = await this.users.recordLoginFailure(user.id);
      await this.audit.record({ action: AuditService.ACTIONS.LOGIN_FAILURE, entityType: 'user',
        entityId: user.id, actor: user, req, after: { lockedUntil } });
      throw new UnauthorizedError('Invalid username or password');
    }

    await this.users.recordLoginSuccess(user.id);
    const accessToken = this.tokens.signAccessToken(user);
    const { token: refreshToken, tokenHash } = this.tokens.issueRefreshToken(user);
    await this.refreshTokens.create({
      id: uuid(), user_id: user.id, token_hash: tokenHash,
      expires_at: this.tokens.refreshExpiryIso(), user_agent: req?.get?.('user-agent') || null,
      ip_address: req?.ip || null,
    });

    await this.audit.record({
      action: AuditService.ACTIONS.LOGIN_SUCCESS, entityType: 'user', entityId: user.id, actor: user, req,
    });

    return { accessToken, refreshToken, user: this.#publicUser(user) };
  }

  async refresh({ refreshToken }, req) {
    if (!refreshToken) throw new UnauthorizedError('Refresh token required');
    const payload = this.tokens.verifyRefreshToken(refreshToken);
    const tokenHash = this.tokens.hashToken(refreshToken);
    const stored = await this.refreshTokens.findActiveByHash(tokenHash);
    if (!stored) throw new UnauthorizedError('Refresh token has been revoked or is unknown');

    const user = await this.users.findById(payload.sub);
    if (!user || !user.is_active) throw new UnauthorizedError('Account no longer active');

    // Rotate: revoke the used token and issue a new pair. Prevents replay of a stolen refresh token.
    await this.refreshTokens.revoke(stored.id);
    const accessToken = this.tokens.signAccessToken(user);
    const { token: newRefreshToken, tokenHash: newHash } = this.tokens.issueRefreshToken(user);
    await this.refreshTokens.create({
      id: uuid(), user_id: user.id, token_hash: newHash,
      expires_at: this.tokens.refreshExpiryIso(), user_agent: req?.get?.('user-agent') || null,
      ip_address: req?.ip || null,
    });

    await this.audit.record({ action: AuditService.ACTIONS.TOKEN_REFRESH, entityType: 'user', entityId: user.id, actor: user, req });
    return { accessToken, refreshToken: newRefreshToken, user: this.#publicUser(user) };
  }

  async logout({ refreshToken }, actor, req) {
    if (refreshToken) await this.refreshTokens.revoke(this.tokens.hashToken(refreshToken));
    await this.audit.record({ action: AuditService.ACTIONS.LOGOUT, entityType: 'user', entityId: actor?.id, actor, req });
    return { success: true };
  }

  async logoutAllSessions(userId, actor, req) {
    const count = await this.refreshTokens.revokeAllForUser(userId);
    await this.audit.record({ action: AuditService.ACTIONS.LOGOUT, entityType: 'user', entityId: userId, actor, req,
      reason: `revoked ${count} session(s)` });
    return { revoked: count };
  }

  async createUser({ username, password, fullName, role, facilityId, registrationNo }, actor, req) {
    const existing = await this.users.findByUsername(username);
    if (existing) throw new ConflictError('Username already exists');
    const strength = this.password.validateStrength(password);
    if (!strength.valid) throw new ValidationError('Password does not meet policy', strength.issues);

    const user = await this.users.create({
      id: uuid(), username, password_hash: await this.password.hash(password),
      full_name: fullName, role, facility_id: facilityId || null, registration_no: registrationNo || null,
    });
    await this.audit.record({ action: AuditService.ACTIONS.USER_CREATED, entityType: 'user', entityId: user.id, actor, req,
      after: this.#publicUser(user) });
    return this.#publicUser(user);
  }

  requireRole(user, ...roles) {
    if (!roles.includes(user.role)) throw new ForbiddenError(`Requires role: ${roles.join(' or ')}`);
    return true;
  }

  #publicUser(user) {
    const { password_hash, failed_logins, locked_until, ...rest } = user;
    return rest;
  }
}

module.exports = AuthService;
