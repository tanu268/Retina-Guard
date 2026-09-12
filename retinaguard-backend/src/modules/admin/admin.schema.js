'use strict';
const { z } = require('zod');

/**
 * Administrator-manageable roles. 'district' is provisioned separately (it
 * represents a district-level node, not a facility user) and is deliberately
 * excluded from self-service creation here.
 */
const MANAGEABLE_ROLES = ['technician', 'reviewer', 'admin'];

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(60),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(1).max(200),
  role: z.enum(MANAGEABLE_ROLES),
  facilityId: z.string().max(100).optional(),
  registrationNo: z.string().max(60).optional(),
});

const updateUserSchema = z.object({
  fullName: z.string().trim().min(1).max(200).optional(),
  role: z.enum(MANAGEABLE_ROLES).optional(),
  facilityId: z.string().max(100).optional(),
  registrationNo: z.string().max(60).optional(),
});

const listUsersQuerySchema = z.object({
  role: z.enum(MANAGEABLE_ROLES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

module.exports = { createUserSchema, updateUserSchema, listUsersQuerySchema, MANAGEABLE_ROLES };
