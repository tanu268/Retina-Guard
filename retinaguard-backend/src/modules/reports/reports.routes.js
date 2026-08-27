'use strict';
const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const buildReportsController = require('./reports.controller');

function buildReportsRouter(deps) {
  const router = Router();
  const controller = buildReportsController(deps);
  const auth = authenticate(deps);

  /**
   * @openapi
   * /reports/{consultationId}/generate:
   *   post:
   *     tags: [Reports]
   *     summary: Generate (or regenerate) the screening report PDF + JSON for a case
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: consultationId, required: true, schema: { type: string } }]
   *     responses:
   *       201: { description: Report generated }
   */
  router.post('/:consultationId/generate', auth, authorize('technician', 'reviewer', 'admin'), controller.generate);

  /**
   * @openapi
   * /reports/{consultationId}/json:
   *   get:
   *     tags: [Reports]
   *     summary: Latest report as JSON (schema in docs/interfaces.ts)
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: consultationId, required: true, schema: { type: string } }]
   *     responses:
   *       200: { description: Report JSON }
   */
  router.get('/:consultationId/json', auth, controller.getJson);

  /**
   * @openapi
   * /reports/{consultationId}/pdf:
   *   get:
   *     tags: [Reports]
   *     summary: Latest report as a rendered PDF
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: consultationId, required: true, schema: { type: string } }]
   *     responses:
   *       200: { description: PDF stream, content: { application/pdf: {} } }
   */
  router.get('/:consultationId/pdf', auth, controller.getPdf);

  /**
   * @openapi
   * /reports/verify/{token}:
   *   get:
   *     tags: [Reports]
   *     summary: Public QR verification lookup (no PHI in the response)
   *     responses:
   *       200: { description: Verification result }
   *       404: { $ref: '#/components/responses/NotFound' }
   */
  router.get('/verify/:token', controller.verify);

  return router;
}

module.exports = buildReportsRouter;
