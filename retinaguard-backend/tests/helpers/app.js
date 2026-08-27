'use strict';
const buildApp = require('../../src/app');
const { buildTestContainer } = require('./buildTestContainer');

/** Builds a fresh Express app + container pair, ready for supertest. */
async function buildTestApp() {
  const container = await buildTestContainer();
  const app = buildApp(container);
  return { app, container };
}

module.exports = { buildTestApp };
