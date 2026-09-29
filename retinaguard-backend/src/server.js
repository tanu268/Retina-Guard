'use strict';
const http = require('http');
const { config, assertProductionSecrets } = require('./config');
const logger = require('./utils/logger');
const { buildContainer } = require('./container');
const buildApp = require('./app');
const attachWebsocket = require('./websocket');

async function start() {
  assertProductionSecrets();

  const container = await buildContainer();
  const app = buildApp(container);
  const httpServer = http.createServer(app);

  if (config.mvpNoAuth) {
    try {
      container.repos.userRepository.db.run(`
        INSERT INTO users (id, username, password_hash, full_name, role, facility_id, is_active)
        VALUES ('mvp-demo-user', 'demo-mvp', 'nopassword', 'MVP Demo User', 'technician', ?, 1)
        ON CONFLICT(id) DO NOTHING;
      `, [config.node.siteId]);
      logger.info('MVP_NO_AUTH enabled: injected mvp-demo-user');
    } catch (err) {
      logger.error({ err }, 'Failed to inject mvp-demo-user');
    }
  }


  attachWebsocket(httpServer, {
    tokenService: container.services.tokenService,
    userRepository: container.repos.userRepository,
    config,
    eventBus: container.eventBus,
  });

  container.services.syncManager.start();

  httpServer.listen(config.port, () => {
    logger.info({
      port: config.port, env: config.env, site: config.node.siteId,
      matlabAdapter: config.matlab.adapter, districtSync: config.postgres.enabled,
    }, `RetinaGuard backend listening on port ${config.port} — docs at /docs`);
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutting down gracefully');
    httpServer.close(async () => {
      await container.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  ['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));

  process.on('unhandledRejection', (err) => logger.error({ err }, 'Unhandled promise rejection'));
  process.on('uncaughtException', (err) => { logger.error({ err }, 'Uncaught exception'); process.exit(1); });

  return { app, httpServer, container };
}

if (require.main === module) {
  start().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Fatal startup error:', err);
    process.exit(1);
  });
}

module.exports = { start };
