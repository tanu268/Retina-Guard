'use strict';
const { sha256, canonicalJson } = require('../utils/hash');

/**
 * Optional HTTP idempotency for write endpoints. A client (technician app on a
 * flaky link) sends `Idempotency-Key`; a retried request with the same key and
 * body replays the original response instead of re-executing the side effect.
 */
function idempotency({ idempotencyRepository }) {
  return async (req, res, next) => {
    const key = req.get('Idempotency-Key');
    if (!key || !['POST', 'PATCH'].includes(req.method)) return next();

    const requestHash = sha256(canonicalJson({ path: req.path, body: req.body }));
    const { fresh, record } = await idempotencyRepository.begin({
      key, endpoint: req.path, userId: req.user?.id, requestHash,
    });

    if (!fresh) {
      if (record.request_hash !== requestHash) {
        return res.status(409).json({
          error: { code: 'IDEMPOTENCY_KEY_REUSED', message: 'This Idempotency-Key was used for a different request.' },
        });
      }
      if (record.state === 'completed') {
        return res.status(record.status_code).json(JSON.parse(record.response_body));
      }
      return res.status(409).json({
        error: { code: 'REQUEST_IN_PROGRESS', message: 'A request with this Idempotency-Key is already being processed.' },
      });
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      idempotencyRepository.complete(key, res.statusCode, body).catch(() => {});
      return originalJson(body);
    };
    next();
  };
}

module.exports = idempotency;
