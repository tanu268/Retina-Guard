'use strict';
const asyncHandler = require('../../utils/asyncHandler');

function buildAuditController({ auditService }) {
  const getCaseTrail = asyncHandler(async (req, res) => {
    const entries = await auditService.listByCase(req.params.caseId);
    res.status(200).json({ caseId: req.params.caseId, entries });
  });

  const verify = asyncHandler(async (req, res) => {
    const result = await auditService.verifyChain(req.query.caseId ? { caseId: req.query.caseId } : {});
    res.status(200).json(result);
  });

  return { getCaseTrail, verify };
}

module.exports = buildAuditController;
