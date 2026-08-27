'use strict';
const { randomUUID } = require('node:crypto');

/** Attaches a request id and normalised client info used by the audit trail. */
module.exports = function requestContext(req, res, next) {
  req.id = req.get('x-request-id') || randomUUID();
  req.context = {
    requestId: req.id,
    ip: req.ip,
    userAgent: req.get('user-agent') || null,
    startedAt: Date.now(),
  };
  res.set('x-request-id', req.id);
  next();
};
