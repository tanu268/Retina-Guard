'use strict';
const { z } = require('zod');

const idParamSchema = z.object({ id: z.string().uuid() });
const verifyParamSchema = z.object({ code: z.string().trim().min(6).max(32) });
const generateSchema = z.object({ consultationId: z.string().uuid(), regenerate: z.boolean().optional().default(false) });

module.exports = { idParamSchema, verifyParamSchema, generateSchema };
