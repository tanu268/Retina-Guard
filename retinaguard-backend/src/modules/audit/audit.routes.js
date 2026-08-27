'use strict';
const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const buildAuditController = require('./audit.controller');

function buildAuditRouter(deps) {
  const router = Router();
  const controller = buildAuditController(deps);
  const auth = authenticate(deps);

  /**
   * @openapi
   * /audit/{caseId}:
   *   get:
   *     tags: [Audit]
   *     summary: Full immutable audit trail for a case
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: caseId, required: true, schema: { type: string } }]
   *     responses:
   *       200: { description: Ordered audit entries }
   */
  router.get('/verify', auth, authorize('admin'), controller.verify);
  router.get('/:caseId', auth, authorize('reviewer', 'admin'), controller.getCaseTrail);

  return router;
}

module.exports = buildAuditRouter;
