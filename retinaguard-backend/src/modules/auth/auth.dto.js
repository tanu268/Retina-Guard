'use strict';

/** FRONTEND CONTRACT — see docs/interfaces.ts (UserDTO, AuthSessionDTO). */
const toUserDTO = (u) => ({
  id: u.id,
  username: u.username,
  fullName: u.full_name,
  role: u.role,
  facilityId: u.facility_id,
  districtCode: u.district_code,
  registrationNo: u.registration_no || null,
  isActive: Number(u.is_active) === 1,
  lastLoginAt: u.last_login_at || null,
  createdAt: u.created_at,
});

const toSessionDTO = ({ user, tokens, offlineUntil }) => ({
  user: toUserDTO(user),
  accessToken: tokens.accessToken,
  refreshToken: tokens.refreshToken,
  tokenType: tokens.tokenType,
  expiresIn: tokens.expiresIn,
  offlineUntil,
});

module.exports = { toUserDTO, toSessionDTO };
