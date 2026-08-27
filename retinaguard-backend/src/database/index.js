'use strict';
const path = require('path');
const SqliteDatabase = require('./sqliteDatabase');
const PostgresDatabase = require('./postgresDatabase');
const { runMigrations } = require('./migrationRunner');
const { config } = require('../config');

const SQLITE_MIGRATIONS = path.join(__dirname, 'migrations', 'sqlite');
const POSTGRES_MIGRATIONS = path.join(__dirname, 'migrations', 'postgres');

/**
 * Creates the edge database (always) and the district database (only when
 * DISTRICT_SYNC_ENABLED). Screening must never depend on PostgreSQL being up.
 */
async function createDatabases({ migrate = true } = {}) {
  const edge = new SqliteDatabase({ filePath: config.sqlite.path });
  if (migrate) await runMigrations(edge, SQLITE_MIGRATIONS);

  let district = null;
  if (config.postgres.enabled) {
    district = new PostgresDatabase(config.postgres);
    if (migrate) await runMigrations(district, POSTGRES_MIGRATIONS);
  }
  return { edge, district };
}

module.exports = { createDatabases, SQLITE_MIGRATIONS, POSTGRES_MIGRATIONS, SqliteDatabase, PostgresDatabase };
