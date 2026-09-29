'use strict';
const { UnauthorizedError } = require('../utils/errors');

/** Verifies the bearer access token and attaches req.user. */
function authenticate({ tokenService, userRepository, config }) {
  return async (req, res, next) => {
    try {
      if (config && config.mvpNoAuth) {
        const mvpRole = req.get('x-mvp-role');
        if (mvpRole) {
          req.user = {
            id: 'mvp-demo-user',
            username: `demo-${mvpRole}`,
            role: mvpRole,
            is_active: true,
            facility_id: config.node.siteId
          };
          req.tokenPayload = { sub: 'mvp-demo-user', role: mvpRole };
          return next();
        }
      }

      const header = req.get('authorization') || '';
      const [scheme, token] = header.split(' ');
      if (scheme !== 'Bearer' || !token) throw new UnauthorizedError('Missing bearer token');

      const payload = tokenService.verifyAccessToken(token);
      const user = await userRepository.findById(payload.sub);
      if (!user || !user.is_active) throw new UnauthorizedError('Account no longer active');

      req.user = user;
      req.tokenPayload = payload;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = authenticate;
