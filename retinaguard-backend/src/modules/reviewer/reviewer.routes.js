'use strict';
const { Router } = require('express');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const idempotency = require('../../middleware/idempotency');
const { decisionSchema, queueQuerySchema } = require('./reviewer.schema');
const buildReviewerController = require('./reviewer.controller');

function buildReviewerRouter(deps) {
  const router = Router();
  const controller = buildReviewerController(deps);
  const auth = authenticate(deps);
  const idem = idempotency(deps);

  /**
   * @openapi
   * /review/queue:
   *   get:
   *     tags: [Reviewer]
   *     summary: Prioritised reviewer queue (P0 first, oldest case within tier first)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: priority
   *         schema: { type: string, enum: [P0, P1, P2, P3] }
   *     responses:
   *       200: { description: Paginated queue }
   */
  router.get('/queue', auth, authorize('reviewer', 'admin'), validate(queueQuerySchema, 'query'), controller.queue);

  /**
   * @openapi
   * /review/{id}:
   *   get:
   *     tags: [Reviewer]
   *     summary: Case package for adjudication (consultation, analyses, existing review)
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
   *     responses:
   *       200: { description: Case package }
   */
  router.get('/:id', auth, authorize('reviewer', 'admin'), controller.getCase);

  /**
   * @openapi
   * /review/{id}/decision:
   *   post:
   *     tags: [Reviewer]
   *     summary: Record the human reviewer's adjudication (mandatory, one per case)
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
   *     requestBody:
   *       required: true
   *       content: { application/json: { schema: { $ref: '#/components/schemas/ReviewDecisionRequest' } } }
   *     responses:
   *       201: { description: Review recorded }
   *       409: { description: Case already reviewed }
   */
  router.post('/:id/decision', auth, authorize('reviewer'), idem, validate(decisionSchema), controller.decide);

  return router;
}

module.exports = buildReviewerRouter;
