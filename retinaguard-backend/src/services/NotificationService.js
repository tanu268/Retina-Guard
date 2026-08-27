'use strict';
const logger = require('../utils/logger');
const { WS_EVENTS, ROLES } = require('../config/constants');

/**
 * WebSocket fan-out for reviewer notifications.
 *
 * Deliberately fire-and-forget: a notification failure must never roll back or
 * block a screening action. Rooms are scoped by role and by facility so a
 * technician at one PHC never receives another facility's case traffic.
 */
class NotificationService {
  constructor({ io = null } = {}) { this.io = io; this.buffer = []; }

  attach(io) { this.io = io; return this; }

  emit(event, payload, { rooms = [] } = {}) {
    const message = { event, payload, emittedAt: new Date().toISOString() };
    if (!this.io) {
      // Useful in tests and while the socket server is still starting.
      this.buffer.push({ ...message, rooms });
      return message;
    }
    const targets = rooms.length ? rooms : ['role:REVIEWER', 'role:ADMIN'];
    for (const room of targets) this.io.to(room).emit(event, message);
    logger.debug({ event, rooms: targets }, 'WebSocket event emitted');
    return message;
  }

  caseCreated(payload, facilityId) {
    return this.emit(WS_EVENTS.CASE_CREATED, payload, {
      rooms: [`role:${ROLES.REVIEWER}`, `role:${ROLES.ADMIN}`, `facility:${facilityId}`],
    });
  }

  caseUpdated(payload, facilityId) {
    return this.emit(WS_EVENTS.CASE_UPDATED, payload, {
      rooms: [`role:${ROLES.REVIEWER}`, `role:${ROLES.ADMIN}`, `facility:${facilityId}`,
        ...(payload.consultationId ? [`case:${payload.consultationId}`] : [])],
    });
  }

  reviewCompleted(payload, facilityId) {
    return this.emit(WS_EVENTS.REVIEW_COMPLETED, payload, {
      rooms: [`role:${ROLES.TECHNICIAN}`, `role:${ROLES.ADMIN}`, `facility:${facilityId}`,
        ...(payload.consultationId ? [`case:${payload.consultationId}`] : [])],
    });
  }

  syncFinished(payload) {
    return this.emit(WS_EVENTS.SYNC_FINISHED, payload, {
      rooms: [`role:${ROLES.ADMIN}`, `role:${ROLES.TECHNICIAN}`, `role:${ROLES.REVIEWER}`],
    });
  }

  /** Test helper — returns and clears buffered events emitted with no io attached. */
  drain() { const b = this.buffer; this.buffer = []; return b; }
}

module.exports = NotificationService;
