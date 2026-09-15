'use strict';
const { z } = require('zod');
const { STATES, isValidDistrict } = require('../../config/indiaGeo');

/**
 * Indian mobile number: exactly ten digits, first digit 6-9.
 *
 * The previous pattern (/^[0-9+\-\s]{7,15}$/) accepted 7-digit fragments,
 * 15-digit strings, and punctuation, so "98765" and "987654321012" both passed
 * validation and were written to the patient record. Since the phone number is
 * how a screening camp recalls a patient for referral, a malformed number is a
 * patient who never hears their result.
 *
 * Input is normalised before testing so a pasted "+91 98765 43210" is accepted
 * and stored as "9876543210" rather than rejected on formatting.
 */
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

function normalisePhone(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

const phoneSchema = z
  .string()
  .transform(normalisePhone)
  .refine((v) => INDIAN_MOBILE.test(v), {
    message: 'Enter a 10-digit Indian mobile number (no letters or symbols).',
  });

const DIABETES_HISTORY = ['yes', 'no', 'unknown'];

const basePatientShape = {
  fullName: z.string().trim().min(1).max(200),
  age: z.number().int().min(0).max(130).optional(),
  gender: z.enum(['male', 'female', 'other', 'undisclosed']).optional(),
  phone: phoneSchema.optional(),
  village: z.string().trim().max(200).optional(),
  district: z.string().trim().max(200).optional(),
  state: z.enum(STATES).optional(),
  diabetesHistory: z.enum(DIABETES_HISTORY).optional(),
  diabetesType: z.enum(['type1', 'type2', 'gestational', 'unknown']).optional(),
  diabetesDurationYears: z.number().int().min(1).max(100).optional(),
  hba1c: z.number().min(0).max(20).optional(),
  patientCode: z.string().max(60).optional(),
  facilityId: z.string().max(100).optional(),
};

/**
 * Diabetes conditional rule, enforced server-side as well as in the form:
 *
 *   history = yes      -> duration and HbA1c accepted
 *   history = no       -> both rejected
 *   history = unknown  -> both rejected
 *
 * Rejecting rather than silently dropping matters: if the client sends an
 * HbA1c alongside "no known diabetes", the two statements contradict each
 * other and the record should not be written until that is resolved.
 */
function applyConditionalRules(schema) {
  return schema
    .superRefine((data, ctx) => {
      const known = data.diabetesHistory === 'yes';
      if (!known && data.diabetesHistory !== undefined) {
        if (data.diabetesDurationYears !== undefined && data.diabetesDurationYears !== null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['diabetesDurationYears'],
            message: 'Duration may only be recorded when diabetes history is "yes".',
          });
        }
        if (data.hba1c !== undefined && data.hba1c !== null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['hba1c'],
            message: 'HbA1c may only be recorded when diabetes history is "yes".',
          });
        }
      }
      if (data.district && data.state && !isValidDistrict(data.state, data.district)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['district'],
          message: `"${data.district}" is not a district of ${data.state}.`,
        });
      }
      if (data.district && !data.state) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['state'],
          message: 'Select a state before a district.',
        });
      }
    })
    .transform((data) => {
      // Hidden fields are never persisted, even if a stale client sends them.
      if (data.diabetesHistory && data.diabetesHistory !== 'yes') {
        return { ...data, diabetesDurationYears: undefined, hba1c: undefined };
      }
      return data;
    });
}

const registerPatientSchema = applyConditionalRules(z.object(basePatientShape));
const updatePatientSchema = applyConditionalRules(z.object(basePatientShape).partial());

const listPatientsQuerySchema = z.object({
  q: z.string().max(200).optional(),
  district: z.string().max(200).optional(),
  state: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = {
  registerPatientSchema,
  updatePatientSchema,
  listPatientsQuerySchema,
  normalisePhone,
  INDIAN_MOBILE,
  DIABETES_HISTORY,
};
