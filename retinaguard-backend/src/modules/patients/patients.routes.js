'use strict';
const { Router } = require('express');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const idempotency = require('../../middleware/idempotency');
const { registerPatientSchema, updatePatientSchema, listPatientsQuerySchema } = require('./patients.schema');
const buildPatientsController = require('./patients.controller');

function buildPatientsRouter(deps) {
  const router = Router();
  const controller = buildPatientsController(deps);
  const auth = authenticate(deps);
  const idem = idempotency(deps);

  /**
   * @openapi
   * /patients:
   *   post:
   *     tags: [Patients]
   *     summary: Register a new patient
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: header
   *         name: Idempotency-Key
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content: { application/json: { schema: { $ref: '#/components/schemas/RegisterPatientRequest' } } }
   *     responses:
   *       201: { description: Patient registered, content: { application/json: { schema: { $ref: '#/components/schemas/PatientResponse' } } } }
   *       422: { $ref: '#/components/responses/ValidationError' }
   *   get:
   *     tags: [Patients]
   *     summary: Search / list patients
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: q
   *         schema: { type: string }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200: { description: Paginated patients }
   */
  router.post('/', auth, authorize('technician'), idem, validate(registerPatientSchema), controller.create);
  router.get('/', auth, authorize('technician', 'reviewer', 'district'), validate(listPatientsQuerySchema, 'query'), controller.list);

  /**
   * @openapi
   * /patients/{id}:
   *   get:
   *     tags: [Patients]
   *     summary: Get a patient by ID
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
   *     responses:
   *       200: { description: Patient }
   *       404: { $ref: '#/components/responses/NotFound' }
   *   put:
   *     tags: [Patients]
   *     summary: Update a patient (optimistic concurrency on version)
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
   *     requestBody:
   *       content: { application/json: { schema: { $ref: '#/components/schemas/UpdatePatientRequest' } } }
   *     responses:
   *       200: { description: Updated }
   *       409: { $ref: '#/components/responses/Conflict' }
   */
  router.get('/:id', auth, authorize('technician', 'reviewer', 'district'), controller.get);
  router.put('/:id', auth, authorize('technician'), validate(updatePatientSchema), controller.update);

  return router;
}

module.exports = buildPatientsRouter;
