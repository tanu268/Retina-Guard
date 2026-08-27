'use strict';
const crypto = require('node:crypto');
const config = require('../config');
const { UnauthorizedError } = require('../utils/errors');

/**
 * Node-to-node authentication for district sync.
 *
 * The edge node presents a shared API key plus its node id. Timing-safe
 * comparison avoids leaking the key through response timing.
 *
 * NOTE (documented gap): the PRD does not specify edge↔district trust. A shared
 * key is the minimum defensible choice; mTLS or per-node signed tokens are the
 * intended upgrade path and are described in docs/SYNC_ARCHITECTURE.md.
 */
module.exports = function nodeAuth(req, _res, next) {
  const key = req.get('x-node-api-key') || '';
  const nodeId = req.get('x-node-id') || '';
  const expected = config.sync.nodeApiKey;

  const a = Buffer.from(key);
  const b = Buffer.from(expected);
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!valid) return next(new UnauthorizedError('Invalid node credentials'));
  if (!nodeId) return next(new UnauthorizedError('Missing x-node-id header'));

  req.syncNode = { id: nodeId };
  return next();
};
