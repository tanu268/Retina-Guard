'use strict';
const { Router } = require('express');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const upload = require('../../middleware/upload');
const { uploadImageSchema } = require('./images.schema');
const buildImagesController = require('./images.controller');

function buildImagesRouter(deps) {
  const router = Router();
  const controller = buildImagesController(deps);
  const auth = authenticate(deps);

  /**
   * @openapi
   * /images/upload:
   *   post:
   *     tags: [Images]
   *     summary: Upload a fundus image and run the quality gate
   *     description: >
   *       Runs MATLAB qualityAssessment() synchronously so the technician gets
   *       actionable retake guidance before the patient leaves. A Grade-C image
   *       does not consume the recapture budget check silently — see the
   *       CLINICAL_SAFETY_VIOLATION response once MAX_RECAPTURE_ATTEMPTS is hit.
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [image, consultationId, laterality]
   *             properties:
   *               image: { type: string, format: binary }
   *               consultationId: { type: string, format: uuid }
   *               laterality: { type: string, enum: [left, right] }
   *     responses:
   *       201: { description: Uploaded and quality-assessed }
   *       409: { $ref: '#/components/responses/ClinicalSafety' }
   *       415: { description: Unsupported image type }
   */
  router.post('/upload', auth, authorize('technician'),
    upload.single('image'), validate(uploadImageSchema), controller.upload);

  /**
   * @openapi
   * /images/{id}:
   *   get:
   *     tags: [Images]
   *     summary: Get image metadata
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
   *     responses:
   *       200: { description: Image metadata }
   *   delete:
   *     tags: [Images]
   *     summary: Delete an unanalysed image
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
   *     responses:
   *       200: { description: Deleted }
   *       409: { description: Image already analysed — part of the case record }
   */
  router.get('/:id', auth, authorize('technician', 'reviewer', 'district'), controller.get);
  router.delete('/:id', auth, authorize('technician'), controller.remove);

  /**
   * @openapi
   * /consultations/{consultationId}/images:
   *   get:
   *     tags: [Images]
   *     summary: List all capture attempts for a consultation
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: consultationId, required: true, schema: { type: string } }]
   *     responses:
   *       200: { description: Images for the consultation }
   */
  router.get('/by-consultation/:consultationId', auth, authorize('technician', 'reviewer', 'district'), controller.listByConsultation);

  return router;
}

module.exports = buildImagesRouter;
