'use strict';
const { ForbiddenError, UnauthorizedError } = require('../utils/errors');

/**
 * Route-level RBAC: `authorize('technician', 'admin')`.
 *
 * Previously included an unconditional `req.user.role !== 'admin'` escape
 * hatch, so every authorize() call in the app silently admitted the admin
 * role regardless of which roles were listed — editing a route's role list
 * had no enforcement effect for admin. Every route that legitimately wants
 * admin access already lists 'admin' explicitly (see admin.routes.js,
 * sync.routes.js, reports.routes.js), so removing the bypass changes nothing
 * for those and closes the gap everywhere else.
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (roles.length && !roles.includes(req.user.role)) {
      return next(new ForbiddenError(`This action requires one of: ${roles.join(', ')}`));
    }
    next();
  };
}

module.exports = authorize;
