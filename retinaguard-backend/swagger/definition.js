'use strict';

/**
 * Base OpenAPI 3.0 document. Route-level operations are attached via JSDoc
 * @openapi blocks (see src/modules/**\/*.routes.js) and merged in by
 * swagger-jsdoc at server start (src/app.js).
 */
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'RetinaGuard Backend API',
    version: '1.0.0',
    description:
      'Offline-first Explainable AI backend for Diabetic Retinopathy screening. '
      + 'SIH 2026 · Problem Statement 26038 · Team DrigShift.\n\n'
      + 'This system performs AI-assisted screening/triage only. It does not '
      + 'diagnose. Every result is subject to mandatory human reviewer adjudication.',
    contact: { name: 'Team DrigShift' },
    license: { name: 'MIT' },
  },
  servers: [
    { url: 'http://localhost:4000', description: 'Local edge node' },
    { url: 'https://district.retinaguard.example.org', description: 'District node (illustrative)' },
  ],
  tags: [
    { name: 'Auth' }, { name: 'Patients' }, { name: 'Consultations' }, { name: 'Images' },
    { name: 'Analysis' }, { name: 'Reviewer' }, { name: 'Reports' }, { name: 'Sync' },
    { name: 'Audit' }, { name: 'Admin' }, { name: 'Health' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'object', properties: {
          code: { type: 'string' }, message: { type: 'string' }, details: { type: 'object' },
        } } },
      },
      LoginRequest: {
        type: 'object', required: ['username', 'password'],
        properties: { username: { type: 'string' }, password: { type: 'string' } },
      },
      RefreshRequest: {
        type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' }, refreshToken: { type: 'string' },
          user: { type: 'object' },
        },
      },
      CreateUserRequest: {
        type: 'object', required: ['username', 'password', 'fullName', 'role'],
        properties: {
          username: { type: 'string' }, password: { type: 'string' }, fullName: { type: 'string' },
          role: { type: 'string', enum: ['technician', 'reviewer', 'admin', 'district'] },
          facilityId: { type: 'string' }, registrationNo: { type: 'string' },
        },
      },
      RegisterPatientRequest: {
        type: 'object', required: ['fullName'],
        properties: {
          fullName: { type: 'string' }, age: { type: 'integer' },
          gender: { type: 'string', enum: ['male', 'female', 'other', 'undisclosed'] },
          phone: { type: 'string' }, village: { type: 'string' }, district: { type: 'string' },
          state: { type: 'string' },
          diabetesType: { type: 'string', enum: ['type1', 'type2', 'gestational', 'unknown'] },
          diabetesDurationYears: { type: 'number' }, hba1c: { type: 'number' },
        },
      },
      UpdatePatientRequest: { type: 'object' },
      PatientResponse: { type: 'object', properties: { patient: { type: 'object' }, possibleDuplicates: { type: 'array', items: { type: 'object' } } } },
      CreateConsultationRequest: {
        type: 'object', required: ['patientId', 'identityConfirmed'],
        properties: {
          patientId: { type: 'string', format: 'uuid' },
          identityConfirmed: { type: 'boolean', description: 'Must be true — wrong-patient linkage is a critical risk.' },
          deviceId: { type: 'string' }, notes: { type: 'string' },
        },
      },
      UpdateConsultationRequest: {
        type: 'object',
        properties: {
          status: { type: 'string' }, reviewerId: { type: 'string' }, triagePriority: { type: 'string' },
          notes: { type: 'string' }, finalGradeCode: { type: 'integer' }, finalReferable: { type: 'boolean' },
        },
      },
      RunAnalysisRequest: {
        type: 'object', required: ['imageId'], properties: { imageId: { type: 'string', format: 'uuid' } },
      },
      AnalysisResponse: {
        type: 'object',
        properties: {
          analysis: { type: 'object' }, disclaimer: { type: 'string' },
          isDiagnosis: { type: 'boolean', enum: [false] }, humanReviewRequired: { type: 'boolean', enum: [true] },
        },
      },
      ReviewDecisionRequest: {
        type: 'object', required: ['reviewerGradeCode', 'decision'],
        properties: {
          reviewerGradeCode: { type: 'integer', minimum: 0, maximum: 4 },
          decision: { type: 'string', enum: ['refer', 'routine_recall', 'repeat_imaging', 'escalate'] },
          referralUrgency: { type: 'string', enum: ['immediate', 'within_1_week', 'within_1_month', 'routine'] },
          overrideReason: { type: 'string' }, notes: { type: 'string' },
        },
      },
    },
    responses: {
      NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Unauthorized: { description: 'Missing or invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Forbidden: { description: 'Insufficient role', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Conflict: { description: 'Version or state conflict', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      ValidationError: { description: 'Request failed validation', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      ClinicalSafety: { description: 'A mandatory clinical safety rule blocked this action', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
  },
  security: [{ bearerAuth: [] }],
};
