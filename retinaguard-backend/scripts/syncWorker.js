#!/usr/bin/env node
'use strict';
/**
 * Standalone sync worker — run this on the edge node as a systemd/cron job
 * when you don't want the sync loop tied to the API process lifecycle.
 *   node scripts/syncWorker.js            # runs one push+pull cycle and exits
 *   node scripts/syncWorker.js --loop     # runs continuously on config.sync.intervalMs
 */
const { buildContainer } = require('../src/container');
const logger = require('../src/utils/logger');

async function cycle(container) {
  const pushResult = await container.services.syncService.push({ id: 'sync-worker', role: 'district' }, null);
  const pullResult = await container.services.syncService.pull({ id: 'sync-worker', role: 'district' }, null);
  logger.info({ pushResult, pullResult }, 'Sync cycle complete');
}

(async () => {
  const container = await buildContainer();
  const loop = process.argv.includes('--loop');

  if (!loop) {
    await cycle(container);
    await container.close();
    process.exit(0);
    return;
  }

  logger.info({ intervalMs: container.config.sync.intervalMs }, 'Sync worker running in loop mode');
  const timer = setInterval(() => cycle(container).catch((err) => logger.error({ err }, 'Sync cycle failed')), container.config.sync.intervalMs);
  process.on('SIGINT', async () => { clearInterval(timer); await container.close(); process.exit(0); });
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Sync worker failed:', err);
  process.exit(1);
});
