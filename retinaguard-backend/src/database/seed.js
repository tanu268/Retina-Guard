#!/usr/bin/env node
'use strict';
const { buildContainer } = require('../container');
const { uuid } = require('../utils/ids');
const logger = require('../utils/logger');

const DEMO_USERS = [
  { username: 'tanu.tech', password: 'Tech#Rural2026', fullName: 'Tanu Sharma', role: 'technician', facilityId: 'PHC-INDORE-01' },
  { username: 'reviewer.doc', password: 'Review#Doc2026', fullName: 'Dr. Priyanka Verma', role: 'reviewer',
    facilityId: 'DISTRICT-INDORE', registrationNo: 'MCI-MP-2018-04521' },
  { username: 'admin', password: 'AdminRG#2026Secure', fullName: 'RetinaGuard Administrator', role: 'admin' },
];

(async () => {
  const container = await buildContainer();
  const { services } = container;

  for (const u of DEMO_USERS) {
    const existing = await container.repos.userRepository.findByUsername(u.username);
    if (existing) { logger.info({ username: u.username }, 'Seed user already exists, skipping'); continue; }
    await services.authService.createUser(u, { id: 'seed-script', role: 'admin' }, null);
    logger.info({ username: u.username, role: u.role }, 'Seed user created');
  }

  logger.info('Seed complete. Demo credentials:');
  DEMO_USERS.forEach((u) => logger.info(`  ${u.role.padEnd(11)} ${u.username} / ${u.password}`));

  await container.close();
  process.exit(0);
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
