'use strict';
const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const buildAdminController = require('./admin.controller');

function buildAdminRouter(deps) {
  const router = Router();
  const controller = buildAdminController(deps);
  const auth = authenticate(deps);

  /**
   * @openapi
   * /admin/dashboard:
   *   get:
   *     tags: [Admin]
   *     summary: Operational dashboard — case counts, grade distribution, storage, MATLAB & sync health
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Dashboard snapshot }
   */
  router.get('/dashboard', auth, authorize('admin'), controller.dashboard);

  /**
   * @openapi
   * /admin/users:
   *   get:
   *     tags: [Admin]
   *     summary: List active users
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Users }
   */
  router.get('/users', auth, authorize('admin'), controller.listUsers);

  /**
   * @openapi
   * /admin/users/{id}/deactivate:
   *   post:
   *     tags: [Admin]
   *     summary: Deactivate a user account
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
   *     responses:
   *       200: { description: Deactivated }
   */
  router.post('/users/:id/deactivate', auth, authorize('admin'), controller.deactivateUser);

  /**
   * @openapi
   * /admin/capabilities:
   *   get:
   *     tags: [Admin]
   *     summary: Role → capability map
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Capabilities }
   */
  router.get('/capabilities', auth, authorize('admin'), controller.capabilities);

  return router;
}

module.exports = buildAdminRouter;
