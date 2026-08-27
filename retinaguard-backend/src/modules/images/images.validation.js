'use strict';
const { z } = require('zod');
const { LATERALITY } = require('../../config/constants');

const uploadImageSchema = z.object({
  consultationId: z.string().uuid(),
  laterality: z.nativeEnum(LATERALITY),
  deviceId: z.string().trim().max(64).optional(),
  capturedAt: z.string().datetime().optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

const deleteImageSchema = z.object({
  reason: z.string().trim().min(4).max(300),
});

module.exports = { uploadImageSchema, idParamSchema, deleteImageSchema };
