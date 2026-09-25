'use strict';
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const { config } = require('../config');

/** Central error → HTTP response translation. Must be registered last. */
function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error({ err, path: req.path }, err.message);
    else logger.warn({ code: err.code, path: req.path, details: err.details }, err.message);

    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details ?? undefined },
    });
  }

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } });
  }
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Uploaded file exceeds the size limit' } });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Malformed JSON body' } });
  }

  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      ...(config.isProd ? {} : { stack: err.stack }),
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
}

module.exports = { errorHandler, notFoundHandler };
