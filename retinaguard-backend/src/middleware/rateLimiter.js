'use strict';
const rateLimit = require('express-rate-limit');
const config = require('../config');

const json = (code, message) => (req, res) =>
  res.status(429).json({ success: false, error: { code, message, requestId: req.id } });

const globalLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: json('RATE_LIMITED', 'Too many requests from this client. Please retry shortly.'),
});

/** Login is the credential-stuffing surface, so it gets a much tighter budget. */
const authLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => config.isTest,
  handler: json('AUTH_RATE_LIMITED', 'Too many authentication attempts. Please wait before retrying.'),
});

/** Analysis is CPU-bound on an edge box; protect the screening queue. */
const analysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: json('ANALYSIS_RATE_LIMITED', 'Analysis throughput limit reached on this node.'),
});

module.exports = { globalLimiter, authLimiter, analysisLimiter };
