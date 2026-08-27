'use strict';
const asyncHandler = require('../../utils/asyncHandler');

function buildAuthController({ authService }) {
  const login = asyncHandler(async (req, res) => {
    const result = await authService.login(req.body, req);
    res.status(200).json(result);
  });

  const refresh = asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.body, req);
    res.status(200).json(result);
  });

  const logout = asyncHandler(async (req, res) => {
    const result = await authService.logout(req.body, req.user, req);
    res.status(200).json(result);
  });

  const me = asyncHandler(async (req, res) => {
    const { password_hash, ...user } = req.user;
    res.status(200).json({ user });
  });

  const createUser = asyncHandler(async (req, res) => {
    const user = await authService.createUser(req.body, req.user, req);
    res.status(201).json({ user });
  });

  return { login, refresh, logout, me, createUser };
}

module.exports = buildAuthController;
