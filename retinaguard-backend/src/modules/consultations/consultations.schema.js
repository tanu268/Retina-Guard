'use strict';
const { z } = require('zod');

const createConsultationSchema = z.object({
  patientId: z.string().uuid(),
  identityConfirmed: z.boolean(),
  deviceId: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

const updateConsultationSchema = z.object({
  status: z.enum([
    'registered', 'capture_pending', 'quality_failed', 'analysis_pending',
    'analysis_complete', 'awaiting_review', 'review_complete', 'closed', 'cancelled',
  ]).optional(),
  reviewerId: z.string().uuid().optional(),
  triagePriority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  notes: z.string().max(2000).optional(),
  finalGradeCode: z.number().int().min(0).max(4).optional(),
  finalReferable: z.boolean().optional(),
});

const listConsultationsQuerySchema = z.object({
  status: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { createConsultationSchema, updateConsultationSchema, listConsultationsQuerySchema };
