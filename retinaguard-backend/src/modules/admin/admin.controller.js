'use strict';
const asyncHandler = require('../../utils/asyncHandler');

function buildAdminController({ adminService }) {
  const dashboard = asyncHandler(async (req, res) => {
    res.status(200).json(await adminService.dashboard());
  });

  const listUsers = asyncHandler(async (req, res) => {
    res.status(200).json({ users: await adminService.listUsers(req.query) });
  });

  const deactivateUser = asyncHandler(async (req, res) => {
    res.status(200).json({ user: await adminService.deactivateUser(req.params.id) });
  });

  const capabilities = asyncHandler(async (req, res) => {
    res.status(200).json({ capabilities: adminService.capabilities() });
  });

  return { dashboard, listUsers, deactivateUser, capabilities };
}

module.exports = buildAdminController;
