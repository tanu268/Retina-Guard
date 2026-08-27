'use strict';
const asyncHandler = require('../../utils/asyncHandler');

function buildAnalysisController({ analysisService }) {
  const run = asyncHandler(async (req, res) => {
    const { analysis, envelope } = await analysisService.run(req.body, req.user, req);
    res.status(201).json({ analysis, ...envelope });
  });

  const get = asyncHandler(async (req, res) => {
    const analysis = await analysisService.get(req.params.id);
    res.status(200).json({ analysis });
  });

  const explainability = asyncHandler(async (req, res) => {
    const layers = await analysisService.getExplainability(req.params.id);
    res.status(200).json({ explainability: layers });
  });

  return { run, get, explainability };
}

module.exports = buildAnalysisController;
