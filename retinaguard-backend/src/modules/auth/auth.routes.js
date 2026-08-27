'use strict';
const { Router } = require('express');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const { authLimiter } = require('../../middleware/rateLimiters');
const { loginSchema, refreshSchema, logoutSchema, createUserSchema } = require('./auth.schema');
const buildAuthController = require('./auth.controller');

function buildAuthRouter(deps) {
  const router = Router();
  const controller = buildAuthController(deps);
  const auth = authenticate(deps);

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Authenticate and receive an access/refresh token pair
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/LoginRequest' }
   *     responses:
   *       200: { description: Authenticated, content: { application/json: { schema: { $ref: '#/components/schemas/AuthResponse' } } } }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   */
  router.post('/login', authLimiter, validate(loginSchema), controller.login);

  /**
   * @openapi
   * /auth/refresh:
   *   post:
   *     tags: [Auth]
   *     summary: Exchange a refresh token for a new access/refresh pair (rotates the refresh token)
   *     requestBody:
   *       required: true
   *       content: { application/json: { schema: { $ref: '#/components/schemas/RefreshRequest' } } }
   *     responses:
   *       200: { description: Rotated, content: { application/json: { schema: { $ref: '#/components/schemas/AuthResponse' } } } }
   *       401: { $ref: '#/components/responses/Unauthorized' }
   */
  router.post('/refresh', authLimiter, validate(refreshSchema), controller.refresh);

  /**
   * @openapi
   * /auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Revoke the supplied refresh token
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Logged out }
   */
  router.post('/logout', auth, validate(logoutSchema), controller.logout);

  /**
   * @openapi
   * /auth/me:
   *   get:
   *     tags: [Auth]
   *     summary: Current authenticated user
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Current user }
   */
  router.get('/me', auth, controller.me);

  /**
   * @openapi
   * /auth/users:
   *   post:
   *     tags: [Auth]
   *     summary: Create a new user account (admin only)
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content: { application/json: { schema: { $ref: '#/components/schemas/CreateUserRequest' } } }
   *     responses:
   *       201: { description: User created }
   *       403: { $ref: '#/components/responses/Forbidden' }
   */
  router.post('/users', auth, authorize('admin'), validate(createUserSchema), controller.createUser);

  return router;
}

module.exports = buildAuthRouter;
