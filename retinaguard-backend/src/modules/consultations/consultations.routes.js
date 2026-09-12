'use strict';
const { Router } = require('express');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const idempotency = require('../../middleware/idempotency');
const {
  createConsultationSchema, updateConsultationSchema, listConsultationsQuerySchema,
} = require('./consultations.schema');
const buildConsultationsController = require('./consultations.controller');

function buildConsultationsRouter(deps) {
  const router = Router();
  const controller = buildConsultationsController(deps);
  const auth = authenticate(deps);
  const idem = idempotency(deps);

  /**
   * @openapi
   * /consultations:
   *   post:
   *     tags: [Consultations]
   *     summary: Create a consultation (case) for a patient
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: header, name: Idempotency-Key, schema: { type: string } }]
   *     requestBody:
   *       required: true
   *       content: { application/json: { schema: { $ref: '#/components/schemas/CreateConsultationRequest' } } }
   *     responses:
   *       201: { description: Consultation created }
   *       409: { $ref: '#/components/responses/ClinicalSafety' }
   *   get:
   *     tags: [Consultations]
   *     summary: List consultations
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Paginated consultations }
   */
  router.post('/', auth, authorize('technician'), idem, validate(createConsultationSchema), controller.create);
  router.get('/', auth, authorize('technician', 'reviewer', 'district'), validate(listConsultationsQuerySchema, 'query'), controller.list);

  /**
   * @openapi
   * /consultations/{id}:
   *   get:
   *     tags: [Consultations]
   *     summary: Get a consultation with patient details
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
   *     responses:
   *       200: { description: Consultation }
   *       404: { $ref: '#/components/responses/NotFound' }
   */
  router.get('/:id', auth, authorize('technician', 'reviewer', 'district'), controller.get);

  /**
   * @openapi
   * /consultations/{id}:
   *   patch:
   *     tags: [Consultations]
   *     summary: Transition consultation status or update case fields
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
   *     requestBody:
   *       content: { application/json: { schema: { $ref: '#/components/schemas/UpdateConsultationRequest' } } }
   *     responses:
   *       200: { description: Updated }
   *       409: { description: Illegal status transition or version conflict }
   */
  router.patch('/:id', auth, authorize('technician', 'reviewer'), validate(updateConsultationSchema), controller.update);

  return router;
}

module.exports = buildConsultationsRouter;
