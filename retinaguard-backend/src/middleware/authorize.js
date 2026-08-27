'use strict';
const { ForbiddenError, UnauthorizedError } = require('../utils/errors');

/** Route-level RBAC: `authorize('technician', 'admin')`. */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (roles.length && !roles.includes(req.user.role) && req.user.role !== 'admin') {
      return next(new ForbiddenError(`This action requires one of: ${roles.join(', ')}`));
    }
    next();
  };
}

module.exports = authorize;
