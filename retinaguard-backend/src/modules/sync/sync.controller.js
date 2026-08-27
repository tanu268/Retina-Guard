'use strict';
const asyncHandler = require('../../utils/asyncHandler');

function buildSyncController({ syncService }) {
  const push = asyncHandler(async (req, res) => {
    const result = await syncService.push(req.user, req, { batchSize: req.body?.batchSize });
    res.status(200).json(result);
  });

  const pull = asyncHandler(async (req, res) => {
    const result = await syncService.pull(req.user, req, { since: req.body?.since, limit: req.body?.limit });
    res.status(200).json(result);
  });

  const status = asyncHandler(async (req, res) => {
    const result = await syncService.status();
    res.status(200).json(result);
  });

  const conflicts = asyncHandler(async (req, res) => {
    const items = await syncService.conflicts({ limit: 50 });
    res.status(200).json({ conflicts: items });
  });

  return { push, pull, status, conflicts };
}

module.exports = buildSyncController;
