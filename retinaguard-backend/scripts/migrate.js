'use strict';
const { getDb, closeDb } = require('../src/database');
const { migrate } = require('../src/database/migrator');
const logger = require('../src/utils/logger');

(async () => {
  try {
    const applied = await migrate(getDb());
    logger.info({ applied }, 'Migrations complete');
    await closeDb();
    process.exit(0);
  } catch (err) {
    logger.error({ err: err.message }, 'Migration failed');
    process.exit(1);
  }
})();
