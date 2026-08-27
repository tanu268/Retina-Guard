'use strict';
const { Server } = require('socket.io');
const logger = require('../utils/logger');

/**
 * Reviewer notifications. Blueprint sequence diagram, segment 5: the district
 * server (or edge node in single-site mode) pushes case_created / case_updated
 * / review_completed / sync_finished events to connected reviewer dashboards.
 *
 * Auth: the socket handshake carries the same JWT used for REST calls.
 */
function attachWebsocket(httpServer, { tokenService, userRepository, config, eventBus }) {
  const io = new Server(httpServer, {
    cors: { origin: config.http.corsOrigins, credentials: true },
    path: '/ws',
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = tokenService.verifyAccessToken(token);
      const user = await userRepository.findById(payload.sub);
      if (!user || !user.is_active) return next(new Error('Account not active'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug({ userId: socket.user.id, role: socket.user.role }, 'WebSocket connected');
    // Reviewers and admins join a shared room for queue-wide broadcasts.
    if (['reviewer', 'admin'].includes(socket.user.role)) socket.join('reviewers');
    socket.join(`user:${socket.user.id}`);

    socket.on('disconnect', () => {
      logger.debug({ userId: socket.user.id }, 'WebSocket disconnected');
    });
  });

  const EVENTS = ['case_created', 'case_updated', 'review_completed', 'sync_finished', 'sync_conflict'];
  EVENTS.forEach((event) => {
    eventBus.on(event, (payload) => {
      io.to('reviewers').emit(event, { event, payload, at: new Date().toISOString() });
    });
  });

  return io;
}

module.exports = attachWebsocket;
