'use strict';
// Global Jest setup. NODE_ENV=test forces config.sqlite.path to ':memory:'
// (see src/config/index.js), so every test file gets an isolated database.
process.env.LOG_LEVEL = 'silent';
jest.setTimeout(20000);
