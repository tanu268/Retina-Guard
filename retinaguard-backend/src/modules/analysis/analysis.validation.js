'use strict';
const { z } = require('zod');

const runAnalysisSchema = z.object({
  imageId: z.string().uuid(),
  force: z.boolean().optional().default(false),
});

const idParamSchema = z.object({ id: z.string().uuid() });

const overlayParamSchema = z.object({
  id: z.string().uuid(),
  layer: z.enum(['gradcam', 'lesions', 'anatomy']),
});

module.exports = { runAnalysisSchema, idParamSchema, overlayParamSchema };
