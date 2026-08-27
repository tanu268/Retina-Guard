'use strict';
const { z } = require('zod');

const registerPatientSchema = z.object({
  fullName: z.string().min(1).max(200),
  age: z.number().int().min(0).max(130).optional(),
  gender: z.enum(['male', 'female', 'other', 'undisclosed']).optional(),
  phone: z.string().regex(/^[0-9+\-\s]{7,15}$/).optional(),
  village: z.string().max(200).optional(),
  district: z.string().max(200).optional(),
  state: z.string().max(200).optional(),
  diabetesType: z.enum(['type1', 'type2', 'gestational', 'unknown']).optional(),
  diabetesDurationYears: z.number().min(0).max(80).optional(),
  hba1c: z.number().min(0).max(20).optional(),
  patientCode: z.string().max(60).optional(),
  facilityId: z.string().max(100).optional(),
});

const updatePatientSchema = registerPatientSchema.partial();

const listPatientsQuerySchema = z.object({
  q: z.string().max(200).optional(),
  district: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { registerPatientSchema, updatePatientSchema, listPatientsQuerySchema };
