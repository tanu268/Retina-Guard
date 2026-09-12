'use strict';
const { Router } = require('express');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const idempotency = require('../../middleware/idempotency');
const { runAnalysisSchema } = require('./analysis.schema');
const buildAnalysisController = require('./analysis.controller');

function buildAnalysisRouter(deps) {
  const router = Router();
  const controller = buildAnalysisController(deps);
  const auth = authenticate(deps);
  const idem = idempotency(deps);

  /**
   * @openapi
   * /analysis/run:
   *   post:
   *     tags: [Analysis]
   *     summary: Run the full MATLAB screening pipeline on a quality-passed image
   *     description: >
   *       Executes preprocess → anatomy → DR grading → lesion evidence → Grad-CAM.
   *       A low-confidence, borderline, or evidence-disagreement result is
   *       persisted as an ABSTENTION, never a guessed grade — see
   *       clinicalSafetyService.evaluateAbstention.
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: header, name: Idempotency-Key, schema: { type: string } }]
   *     requestBody:
   *       required: true
   *       content: { application/json: { schema: { $ref: '#/components/schemas/RunAnalysisRequest' } } }
   *     responses:
   *       201: { description: Analysis completed or abstained, content: { application/json: { schema: { $ref: '#/components/schemas/AnalysisResponse' } } } }
   *       409: { description: Image not quality-passed }
   */
  router.post('/run', auth, authorize('technician'), idem, validate(runAnalysisSchema), controller.run);

  /**
   * @openapi
   * /analysis/{id}:
   *   get:
   *     tags: [Analysis]
   *     summary: Get an analysis result
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
   *     responses:
   *       200: { description: Analysis result }
   */
  router.get('/:id', auth, authorize('technician', 'reviewer', 'district'), controller.get);

  /**
   * @openapi
   * /analysis/{id}/explainability:
   *   get:
   *     tags: [Analysis]
   *     summary: Layered explainability evidence (Grad-CAM, lesions, anatomy)
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
   *     responses:
   *       200: { description: Three-layer explanation }
   */
  router.get('/:id/explainability', auth, authorize('technician', 'reviewer', 'district'), controller.explainability);

  return router;
}

module.exports = buildAnalysisRouter;
