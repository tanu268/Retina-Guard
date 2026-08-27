'use strict';
const fs = require('node:fs');
const path = require('node:path');
const logger = require('../utils/logger');
const { sha256 } = require('../utils/hash');
const { nowIso } = require('../utils/time');

const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  name        TEXT PRIMARY KEY,
  checksum    TEXT NOT NULL,
  applied_at  TEXT NOT NULL
);`;

function migrationDir(dialect) {
  return path.join(__dirname, 'migrations', dialect === 'postgres' ? 'postgres' : 'sqlite');
}

function listMigrations(dialect) {
  const dir = migrationDir(dialect);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => {
      const sql = fs.readFileSync(path.join(dir, name), 'utf8');
      return { name, sql, checksum: sha256(sql) };
    });
}

async function migrate(db) {
  await db.exec(MIGRATIONS_TABLE);
  const { rows } = await db.query('SELECT name, checksum FROM schema_migrations');
  const applied = new Map(rows.map((r) => [r.name, r.checksum]));
  const pending = [];

  for (const m of listMigrations(db.dialect)) {
    if (!applied.has(m.name)) { pending.push(m); continue; }
    if (applied.get(m.name) !== m.checksum) {
      throw new Error(
        `Migration ${m.name} was modified after being applied. ` +
        'Create a new migration file instead of editing history.'
      );
    }
  }

  for (const m of pending) {
    logger.info({ migration: m.name, dialect: db.dialect }, 'Applying migration');
    await db.exec(m.sql);
    await db.query(
      'INSERT INTO schema_migrations (name, checksum, applied_at) VALUES (?, ?, ?)',
      [m.name, m.checksum, nowIso()]
    );
  }

  if (!pending.length) logger.info('Schema is up to date — no migrations pending');
  return pending.map((m) => m.name);
}

module.exports = { migrate, listMigrations, migrationDir };
