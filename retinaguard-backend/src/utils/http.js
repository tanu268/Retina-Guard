'use strict';

/**
 * Stable response envelope — FRONTEND CONTRACT.
 * Never change this shape without bumping the contract version in docs/API.md.
 */
const ok = (res, data, meta = undefined, status = 200) =>
  res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });

const created = (res, data, meta) => ok(res, data, meta, 201);
const accepted = (res, data, meta) => ok(res, data, meta, 202);
const noContent = (res) => res.status(204).send();

const paginated = (res, items, { page, limit, total }) =>
  ok(res, items, { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ok, created, accepted, noContent, paginated, asyncHandler };
