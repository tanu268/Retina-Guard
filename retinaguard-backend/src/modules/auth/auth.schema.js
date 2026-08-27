'use strict';
const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(200),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

const createUserSchema = z.object({
  username: z.string().min(3).max(64).regex(/^[a-zA-Z0-9._-]+$/, 'Alphanumeric, dot, underscore or hyphen only'),
  password: z.string().min(10).max(200),
  fullName: z.string().min(1).max(200),
  role: z.enum(['technician', 'reviewer', 'admin', 'district']),
  facilityId: z.string().max(100).optional(),
  registrationNo: z.string().max(100).optional(),
});

module.exports = { loginSchema, refreshSchema, logoutSchema, createUserSchema };
