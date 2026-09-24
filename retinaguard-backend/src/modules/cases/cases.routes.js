'use strict';
const { Router } = require('express');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const upload = require('../../middleware/upload');
const buildCasesController = require('./cases.controller');

function buildCasesRouter(deps) {
  const router = Router();
  const controller = buildCasesController(deps);
  const auth = authenticate(deps);

  /**
   * @openapi
   * /cases:
   *   post:
   *     tags: [Cases]
   *     summary: Create case and upload image (Unified API)
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               image: { type: string, format: binary }
   *               patient_id: { type: string }
   *               consultation_id: { type: string }
   *               laterality: { type: string }
   *               site_id: { type: string }
   *               device_id: { type: string }
   */
  router.post('/cases', auth, authorize('technician'), upload.single('image'), controller.createCase);

  /**
   * @openapi
   * /case/{case_uuid}:
   *   get:
   *     tags: [Cases]
   *     summary: Get aggregated case data
   */
  router.get('/case/:case_uuid', auth, authorize('technician', 'reviewer', 'district'), controller.getCase);

  /**
   * @openapi
   * /case/{case_uuid}/review:
   *   post:
   *     tags: [Cases]
   *     summary: Submit a human review
   */
  router.post('/case/:case_uuid/review', auth, authorize('reviewer'), controller.submitReview);

  /**
   * @openapi
   * /queue:
   *   get:
   *     tags: [Cases]
   *     summary: Get review queue
   */
  router.get('/queue', auth, authorize('reviewer'), controller.getQueue);

  /**
   * @openapi
   * /report/{case_uuid}:
   *   get:
   *     tags: [Cases]
   *     summary: Get screening report
   */
  router.get('/report/:case_uuid', auth, authorize('technician', 'reviewer', 'district'), controller.getReport);

  /**
   * @openapi
   * /model:
   *   get:
   *     tags: [Cases]
   *     summary: Get model info
   */
  router.get('/model', auth, controller.getModel);

  return router;
}

module.exports = buildCasesRouter;
