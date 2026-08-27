'use strict';
const asyncHandler = require('../../utils/asyncHandler');
const { buildPage } = require('../../utils/pagination');

function buildReviewerController({ reviewerService }) {
  const queue = asyncHandler(async (req, res) => {
    const { priority, status, page, limit } = req.query;
    const { items, total } = await reviewerService.queue({ priority, status, limit, offset: (page - 1) * limit });
    res.status(200).json(buildPage({ items, total, page, limit }));
  });

  const getCase = asyncHandler(async (req, res) => {
    const result = await reviewerService.getCase(req.params.id);
    res.status(200).json(result);
  });

  const decide = asyncHandler(async (req, res) => {
    const review = await reviewerService.decide(req.params.id, req.body, req.user, req);
    res.status(201).json({ review });
  });

  return { queue, getCase, decide };
}

module.exports = buildReviewerController;
