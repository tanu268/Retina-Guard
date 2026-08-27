'use strict';
const bcrypt = require('bcryptjs');
const config = require('../../config');
const { uuid } = require('../../utils/ids');
const { nowIso } = require('../../utils/time');
const { ROLES } = require('../../config/constants');

/**
 * Bootstrap accounts and one demonstration device.
 * Passwords are development defaults and MUST be rotated before any field use.
 */
const SEED_USERS = [
  { username: 'admin',      password: 'Admin@12345',      full_name: 'System Administrator',   role: ROLES.ADMIN },
  { username: 'technician', password: 'Technician@12345', full_name: 'Sunita Verma',           role: ROLES.TECHNICIAN },
  { username: 'reviewer',   password: 'Reviewer@12345',   full_name: 'Dr. Anil Deshmukh',      role: ROLES.REVIEWER, registration_no: 'MMC-2011-44821' },
];

async function seed(db) {
  const ts = nowIso();
  const rounds = config.isTest ? 4 : config.auth.bcryptRounds;

  for (const u of SEED_USERS) {
    const { rows } = await db.query('SELECT id FROM users WHERE username = ?', [u.username]);
    if (rows.length) continue;
    await db.query(
      `INSERT INTO users (id, username, password_hash, full_name, role, facility_id, district_code,
                          registration_no, is_active, version, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,1,1,?,?)`,
      [uuid(), u.username, await bcrypt.hash(u.password, rounds), u.full_name, u.role,
       config.node.id, config.node.districtCode, u.registration_no || null, ts, ts]
    );
  }

  const { rows: dev } = await db.query('SELECT id FROM devices WHERE device_code = ?', ['FC-DEMO-001']);
  if (!dev.length) {
    await db.query(
      `INSERT INTO devices (id, device_code, model, facility_id, district_code, is_active, created_at, updated_at)
       VALUES (?,?,?,?,?,1,?,?)`,
      [uuid(), 'FC-DEMO-001', 'Portable non-mydriatic fundus camera', config.node.id, config.node.districtCode, ts, ts]
    );
  }

  return { users: SEED_USERS.map((u) => u.username) };
}

module.exports = { seed, SEED_USERS };
