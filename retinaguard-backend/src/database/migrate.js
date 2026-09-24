#!/usr/bin/env node
'use strict';
const path = require('path');
const SqliteDatabase = require('./sqliteDatabase');
const PostgresDatabase = require('./postgresDatabase');
const { runMigrations, migrationStatus } = require('./migrationRunner');
const { config } = require('../config');

const targets = () => {
  const list = [{
    name: 'sqlite(edge)',
    db: new SqliteDatabase({ filePath: config.sqlite.path }),
    dir: path.join(__dirname, 'migrations', 'sqlite'),
  }];
  if (config.postgres.enabled) {
    list.push({
      name: 'postgres(district)',
      db: new PostgresDatabase(config.postgres),
      dir: path.join(__dirname, 'migrations', 'postgres'),
    });
  }
  return list;
};

const migrate = async (opts = {}) => {
  const command = process.argv[2] || 'up';
  for (const t of targets()) {
    if (command === 'status') {
      const rows = await migrationStatus(t.db, t.dir);
      if (!opts.silent) process.stdout.write(`\n${t.name}\n`);
      if (!opts.silent) rows.forEach((r) => process.stdout.write(`  [${r.applied ? 'x' : ' '}] ${r.file}\n`));
    } else {
      const rows = await runMigrations(t.db, t.dir);
      if (!opts.silent) process.stdout.write(`\n${t.name}\n`);
      if (!opts.silent) rows.forEach((r) => process.stdout.write(`  ${r.status.padEnd(8)} ${r.file}\n`));
    }
    await t.db.close?.();
  }
  if (!opts.silent) process.stdout.write('\nDone.\n');
};

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch((err) => {
    process.stderr.write(`Migration failed: ${err.message}\n`);
    process.exit(1);
  });
}

module.exports = { migrate };
