'use strict';
const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const buildSyncController = require('./sync.controller');

function buildSyncRouter(deps) {
  const router = Router();
  const controller = buildSyncController(deps);
  const auth = authenticate(deps);

  /**
   * @openapi
   * /sync/push:
   *   post:
   *     tags: [Sync]
   *     summary: Push the pending outbox batch to the district PostgreSQL node
   *     description: >
   *       Idempotent: each outbox row carries a deterministic key, so a repeated
   *       push after a dropped connection never double-applies. Returns
   *       {skipped:true} when no district node is configured for this edge node.
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Push summary }
   */
  router.post('/push', auth, authorize('technician', 'admin', 'district'), controller.push);

  /**
   * @openapi
   * /sync/pull:
   *   post:
   *     tags: [Sync]
   *     summary: Pull district-side changes (e.g. remote reviewer decisions) since a timestamp
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Pull summary }
   */
  router.post('/pull', auth, authorize('technician', 'admin', 'district'), controller.pull);

  /**
   * @openapi
   * /sync/status:
   *   get:
   *     tags: [Sync]
   *     summary: Outbox status by entity type and by state
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Sync status }
   */
  router.get('/status', auth, controller.status);

  /**
   * @openapi
   * /sync/conflicts:
   *   get:
   *     tags: [Sync]
   *     summary: Items the district node rejected as version conflicts
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Conflict list }
   */
  router.get('/conflicts', auth, authorize('admin'), controller.conflicts);

  return router;
}

module.exports = buildSyncRouter;
