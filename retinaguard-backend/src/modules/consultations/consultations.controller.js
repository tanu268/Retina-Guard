'use strict';
const asyncHandler = require('../../utils/asyncHandler');
const { buildPage } = require('../../utils/pagination');

function buildConsultationsController({ consultationService }) {
  const create = asyncHandler(async (req, res) => {
    const consultation = await consultationService.create(req.body, req.user, req);
    res.status(201).json({ consultation });
  });

  const get = asyncHandler(async (req, res) => {
    const consultation = await consultationService.get(req.params.id);
    res.status(200).json({ consultation });
  });

  const update = asyncHandler(async (req, res) => {
    const consultation = await consultationService.update(req.params.id, req.body, req.user, req);
    res.status(200).json({ consultation });
  });

  const list = asyncHandler(async (req, res) => {
    const { status, page, limit } = req.query;
    const { items, total } = await consultationService.list({ status, page, limit });
    res.status(200).json(buildPage({ items, total, page, limit }));
  });

  return { create, get, update, list };
}

module.exports = buildConsultationsController;
