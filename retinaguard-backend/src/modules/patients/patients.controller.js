'use strict';
const asyncHandler = require('../../utils/asyncHandler');
const { buildPage } = require('../../utils/pagination');

function buildPatientsController({ patientService }) {
  const create = asyncHandler(async (req, res) => {
    const { patient, possibleDuplicates } = await patientService.register(req.body, req.user, req);
    res.status(201).json({ patient, possibleDuplicates });
  });

  const list = asyncHandler(async (req, res) => {
    const { q, district, page, limit } = req.query;
    const { items, total } = await patientService.list({ q, district, page, limit });
    res.status(200).json(buildPage({ items, total, page, limit }));
  });

  const get = asyncHandler(async (req, res) => {
    const patient = await patientService.get(req.params.id);
    res.status(200).json({ patient });
  });

  const update = asyncHandler(async (req, res) => {
    const patient = await patientService.update(req.params.id, req.body, req.user, req);
    res.status(200).json({ patient });
  });

  return { create, list, get, update };
}

module.exports = buildPatientsController;
