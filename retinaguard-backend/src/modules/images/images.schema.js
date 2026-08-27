'use strict';
const { z } = require('zod');

const uploadImageSchema = z.object({
  consultationId: z.string().uuid(),
  laterality: z.enum(['left', 'right']),
});

module.exports = { uploadImageSchema };
