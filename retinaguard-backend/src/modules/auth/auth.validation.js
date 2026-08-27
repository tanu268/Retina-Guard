'use strict';
const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().trim().min(3).max(64),
  password: z.string().min(8).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(20).optional(),
  allDevices: z.boolean().optional().default(false),
});

module.exports = { loginSchema, refreshSchema, logoutSchema };
