'use strict';
const fs = require('node:fs');
const config = require('../src/config');
const logger = require('../src/utils/logger');

if (config.db.driver !== 'sqlite') {
  logger.error('reset-db only supports the SQLite edge database. Drop the PostgreSQL schema manually.');
  process.exit(1);
}
for (const suffix of ['', '-wal', '-shm']) {
  const f = `${config.db.sqlitePath}${suffix}`;
  if (fs.existsSync(f)) { fs.unlinkSync(f); logger.info({ f }, 'Removed'); }
}
logger.info('Edge database reset. Run `npm run migrate && npm run seed`.');
