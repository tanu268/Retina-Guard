'use strict';
const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { createUserSchema, updateUserSchema, listUsersQuerySchema } = require('./admin.schema');
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
   *     summary: Administrative overview — patient/user/screening totals, district distribution, storage, sync health, recent activity
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Dashboard snapshot }
   */
  router.get('/dashboard', auth, authorize('admin', 'district'), controller.dashboard);

  /**
   * @openapi
   * /admin/users:
   *   get:
   *     tags: [Admin]
   *     summary: List active users, optionally filtered by role
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Users }
   *   post:
   *     tags: [Admin]
   *     summary: Create a technician, reviewer or administrator account
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       201: { description: Created }
   *       409: { description: Username already exists }
   */
  router.get('/users', auth, authorize('admin'), validate(listUsersQuerySchema, 'query'), controller.listUsers);
  router.post('/users', auth, authorize('admin'), validate(createUserSchema), controller.createUser);

  /**
   * @openapi
   * /admin/users/{id}:
   *   patch:
   *     tags: [Admin]
   *     summary: Edit a user's name, role, facility or registration number
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
   *     responses:
   *       200: { description: Updated }
   *   delete:
   *     tags: [Admin]
   *     summary: Permanently remove a user account
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
   *     responses:
   *       200: { description: Deleted }
   *       403: { description: Cannot delete your own account }
   */
  router.patch('/users/:id', auth, authorize('admin'), validate(updateUserSchema), controller.updateUser);
  router.delete('/users/:id', auth, authorize('admin'), controller.deleteUser);

  /**
   * @openapi
   * /admin/users/{id}/deactivate:
   *   post:
   *     tags: [Admin]
   *     summary: Disable a user account (reversible)
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
   *     responses:
   *       200: { description: Deactivated }
   *       403: { description: Cannot deactivate your own account }
   */
  router.post('/users/:id/deactivate', auth, authorize('admin'), controller.deactivateUser);

  /**
   * @openapi
   * /admin/users/{id}/activate:
   *   post:
   *     tags: [Admin]
   *     summary: Re-enable a disabled user account
   *     security: [{ bearerAuth: [] }]
   *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
   *     responses:
   *       200: { description: Activated }
   */
  router.post('/users/:id/activate', auth, authorize('admin'), controller.activateUser);

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
