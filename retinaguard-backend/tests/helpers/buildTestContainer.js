'use strict';
const { buildContainer } = require('../../src/container');

/** Fresh in-memory SQLite container per test file (or per test if you await it in beforeEach). */
async function buildTestContainer(overrides = {}) {
  const container = await buildContainer({ migrate: true });
  return { ...container, ...overrides };
}

module.exports = { buildTestContainer };
