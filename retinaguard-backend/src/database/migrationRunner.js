'use strict';
const fs = require('fs');
const path = require('path');
const { sha256 } = require('../utils/hash');
const logger = require('../utils/logger');

const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  name       TEXT PRIMARY KEY,
  checksum   TEXT NOT NULL,
  applied_at TEXT NOT NULL
)`;

function migrationFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
}

/**
 * Applies pending .sql migrations in filename order and records a checksum so a
 * silently edited migration is detected rather than re-run.
 */
async function runMigrations(db, dir) {
  await db.exec(MIGRATIONS_TABLE);
  const applied = new Map(
    (await db.all('SELECT name, checksum FROM schema_migrations')).map((r) => [r.name, r.checksum]),
  );

  const results = [];
  for (const file of migrationFiles(dir)) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    const checksum = sha256(sql);

    if (applied.has(file)) {
      if (applied.get(file) !== checksum) {
        throw new Error(`Migration ${file} was modified after being applied (checksum mismatch).`);
      }
      results.push({ file, status: 'skipped' });
      continue;
    }

    await db.exec(sql);
    await db.run('INSERT INTO schema_migrations (name, checksum, applied_at) VALUES (?, ?, ?)',
      [file, checksum, new Date().toISOString()]);
    logger.info({ file }, 'Migration applied');
    results.push({ file, status: 'applied' });
  }
  return results;
}

async function migrationStatus(db, dir) {
  await db.exec(MIGRATIONS_TABLE);
  const applied = new Set((await db.all('SELECT name FROM schema_migrations')).map((r) => r.name));
  return migrationFiles(dir).map((file) => ({ file, applied: applied.has(file) }));
}

module.exports = { runMigrations, migrationStatus, migrationFiles };
