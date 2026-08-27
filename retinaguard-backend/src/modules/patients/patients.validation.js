'use strict';
const { z } = require('zod');

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

const createPatientSchema = z.object({
  patientCode: z.string().trim().min(3).max(40).optional(),
  name: z.string().trim().min(2).max(120),
  sex: z.enum(['M', 'F', 'O']),
  dateOfBirth: isoDate.optional(),
  ageYears: z.coerce.number().int().min(0).max(120).optional(),
  phone: z.string().trim().regex(/^[0-9+\-\s]{6,15}$/, 'Enter a valid phone number').optional(),
  village: z.string().trim().max(120).optional(),
  block: z.string().trim().max(120).optional(),
  districtCode: z.string().trim().max(40).optional(),
  diabetesDurationYears: z.coerce.number().min(0).max(80).optional(),
  nationalId: z.string().trim().min(4).max(32).optional(),
}).refine((v) => v.dateOfBirth || v.ageYears !== undefined, {
  message: 'Either dateOfBirth or ageYears is required',
  path: ['ageYears'],
});

const updatePatientSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  sex: z.enum(['M', 'F', 'O']).optional(),
  dateOfBirth: isoDate.optional(),
  ageYears: z.coerce.number().int().min(0).max(120).optional(),
  phone: z.string().trim().regex(/^[0-9+\-\s]{6,15}$/).optional(),
  village: z.string().trim().max(120).optional(),
  block: z.string().trim().max(120).optional(),
  diabetesDurationYears: z.coerce.number().min(0).max(80).optional(),
  expectedVersion: z.coerce.number().int().min(1).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be supplied' });

const listPatientsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  districtCode: z.string().trim().max(40).optional(),
  facilityId: z.string().trim().max(64).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const idParamSchema = z.object({ id: z.string().uuid('Expected a UUID') });

module.exports = { createPatientSchema, updatePatientSchema, listPatientsSchema, idParamSchema };
