'use strict';
const asyncHandler = require('../../utils/asyncHandler');

function buildAdminController({ adminService }) {
  const dashboard = asyncHandler(async (req, res) => {
    res.status(200).json(await adminService.dashboard());
  });

  const listUsers = asyncHandler(async (req, res) => {
    res.status(200).json({ users: await adminService.listUsers(req.query) });
  });

  const createUser = asyncHandler(async (req, res) => {
    const user = await adminService.createUser(req.body, req.user, req);
    res.status(201).json({ user });
  });

  const updateUser = asyncHandler(async (req, res) => {
    const user = await adminService.updateUser(req.params.id, req.body, req.user, req);
    res.status(200).json({ user });
  });

  const deactivateUser = asyncHandler(async (req, res) => {
    const user = await adminService.deactivateUser(req.params.id, req.user, req);
    res.status(200).json({ user });
  });

  const activateUser = asyncHandler(async (req, res) => {
    const user = await adminService.activateUser(req.params.id, req.user, req);
    res.status(200).json({ user });
  });

  const deleteUser = asyncHandler(async (req, res) => {
    const result = await adminService.deleteUser(req.params.id, req.user, req);
    res.status(200).json(result);
  });

  const capabilities = asyncHandler(async (req, res) => {
    res.status(200).json({ capabilities: adminService.capabilities() });
  });

  return {
    dashboard, listUsers, createUser, updateUser,
    deactivateUser, activateUser, deleteUser, capabilities,
  };
}

module.exports = buildAdminController;
