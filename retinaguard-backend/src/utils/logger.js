'use strict';
const pino = require('pino');
const { config } = require('../config');

const transport = (!config.isProd && !config.isTest)
  ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' } }
  : undefined;

const logger = pino({
  level: config.logLevel,
  base: { site: config.node.siteId, device: config.node.deviceId },
  // Never let PHI or credentials reach the log sink.
  redact: {
    paths: [
      'req.headers.authorization', 'req.headers.cookie',
      'password', '*.password', '*.passwordHash', 'password_hash',
      'refreshToken', '*.refreshToken', 'accessToken', '*.accessToken',
      'patient.full_name', 'patient.phone', '*.phone',
    ],
    censor: '[REDACTED]',
  },
  transport,
});

module.exports = logger;
