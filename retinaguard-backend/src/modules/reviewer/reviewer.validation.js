'use strict';
const { z } = require('zod');
const { PRIORITY, REVIEW_DECISION } = require('../../config/constants');

const queueSchema = z.object({
  priority: z.nativeEnum(PRIORITY).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const idParamSchema = z.object({ id: z.string().uuid() });

const decisionBase = z.object({
  decision: z.nativeEnum(REVIEW_DECISION),
  finalGradeCode: z.coerce.number().int().min(0).max(4).optional(),
  overrideReason: z.string().trim().min(5).max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  reviewDurationMs: z.coerce.number().int().min(0).max(3600000).optional(),
  escalationTarget: z.string().trim().max(120).optional(),
});

/** An override is only accountable if it carries both a grade and a reason. */
const overrideRule = (v, ctx) => {
  if (v.decision !== REVIEW_DECISION.OVERRIDE) return;
  if (v.finalGradeCode === undefined) {
    ctx.addIssue({ code: 'custom', path: ['finalGradeCode'], message: 'An override must state the reviewer grade' });
  }
  if (!v.overrideReason) {
    ctx.addIssue({ code: 'custom', path: ['overrideReason'], message: 'An override must state a reason' });
  }
};

const decisionSchema = decisionBase.superRefine(overrideRule);
const submitSchema = decisionBase
  .extend({ consultationId: z.string().uuid() })
  .superRefine(overrideRule);

module.exports = { queueSchema, idParamSchema, decisionSchema, submitSchema };
