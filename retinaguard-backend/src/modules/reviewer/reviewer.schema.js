'use strict';
const { z } = require('zod');

const decisionSchema = z.object({
  reviewerGradeCode: z.number().int().min(0).max(4),
  decision: z.enum(['refer', 'routine_recall', 'repeat_imaging', 'escalate']),
  referralUrgency: z.enum(['immediate', 'within_1_week', 'within_1_month', 'routine']).optional(),
  overrideReason: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
  reviewStartedAt: z.string().datetime().optional(),
});

const queueQuerySchema = z.object({
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  status: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { decisionSchema, queueQuerySchema };
