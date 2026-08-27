'use strict';
const rateLimit = require('express-rate-limit');
const { config } = require('../config');

const standardLimiter = rateLimit({
  windowMs: config.http.rateLimitWindowMs,
  max: config.http.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down.' } },
});

const authLimiter = rateLimit({
  windowMs: config.http.rateLimitWindowMs,
  max: config.http.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Try again later.' } },
});

module.exports = { standardLimiter, authLimiter };
