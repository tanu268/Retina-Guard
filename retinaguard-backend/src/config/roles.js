'use strict';

/**
 * RBAC roles. Blueprint §13/§14 recognises technician, reviewer and admin
 * responsibilities at the edge node. A "district" service account is used by
 * the district server when pulling from edge nodes.
 */
const ROLES = Object.freeze({
  TECHNICIAN: 'technician',
  REVIEWER: 'reviewer',
  ADMIN: 'admin',
  DISTRICT: 'district',
});

const ALL_ROLES = Object.freeze(Object.values(ROLES));

/** Coarse-grained capability map — used by tests and the /admin/capabilities endpoint. */
const CAPABILITIES = Object.freeze({
  [ROLES.TECHNICIAN]: [
    'patient:create', 'patient:read', 'patient:update',
    'consultation:create', 'consultation:read', 'consultation:update',
    'image:upload', 'image:read', 'image:delete',
    'analysis:run', 'analysis:read', 'report:read', 'sync:trigger',
  ],
  [ROLES.REVIEWER]: [
    'patient:read', 'consultation:read', 'image:read',
    'analysis:read', 'review:read', 'review:decide',
    'report:read', 'audit:read',
  ],
  [ROLES.ADMIN]: ['*'],
  [ROLES.DISTRICT]: ['sync:push', 'sync:pull', 'sync:status'],
});

module.exports = { ROLES, ALL_ROLES, CAPABILITIES };
