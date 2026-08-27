'use strict';
const { z } = require('zod');

const runAnalysisSchema = z.object({
  imageId: z.string().uuid(),
});

module.exports = { runAnalysisSchema };
