'use strict';
const { z } = require('zod');
const { CONSULTATION_STATUS, PRIORITY } = require('../../config/constants');

const createConsultationSchema = z.object({
  patientId: z.string().uuid(),
  // Clinical-safety requirement: the technician must positively confirm that
  // the patient in front of the camera is the patient on screen.
  identityConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'Patient identity must be confirmed before a case can be opened' }),
  }),
  chiefComplaint: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  deviceId: z.string().trim().max(64).optional(),
});

const patchConsultationSchema = z.object({
  status: z.nativeEnum(CONSULTATION_STATUS).optional(),
  priority: z.nativeEnum(PRIORITY).optional(),
  notes: z.string().trim().max(2000).optional(),
  chiefComplaint: z.string().trim().max(500).optional(),
  expectedVersion: z.coerce.number().int().min(1).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be supplied' });

const listConsultationsSchema = z.object({
  status: z.nativeEnum(CONSULTATION_STATUS).optional(),
  priority: z.nativeEnum(PRIORITY).optional(),
  patientId: z.string().uuid().optional(),
  technicianId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const idParamSchema = z.object({ id: z.string().uuid() });

module.exports = {
  createConsultationSchema, patchConsultationSchema, listConsultationsSchema, idParamSchema,
};
