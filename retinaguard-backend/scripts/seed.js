'use strict';
const { getDb, closeDb } = require('../src/database');
const { migrate } = require('../src/database/migrator');
const { seed } = require('../src/database/seeds/001_bootstrap');
const logger = require('../src/utils/logger');

(async () => {
  try {
    const db = getDb();
    await migrate(db);
    const result = await seed(db);
    logger.info(result, 'Seed complete — rotate the default passwords before field use');
    await closeDb();
    process.exit(0);
  } catch (err) {
    logger.error({ err: err.message }, 'Seed failed');
    process.exit(1);
  }
})();
