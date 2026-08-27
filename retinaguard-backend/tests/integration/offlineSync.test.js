'use strict';
const { buildTestContainer } = require('../helpers/buildTestContainer');
const { createTechnician, registerPatient } = require('../helpers/factories');

/**
 * Simulates the offline → connectivity restored → sync cycle from Blueprint §08,
 * using a lightweight in-memory stub in place of a real PostgreSQL district node
 * (so this suite runs without a live Postgres instance).
 */
function buildStubDistrictDb() {
  const tables = { patients: new Map(), sync_receipts: new Map() };
  return {
    async get(sql, params = []) {
      if (sql.includes('sync_receipts')) return tables.sync_receipts.get(params[0]) || null;
      if (sql.includes('FROM patients')) return tables.patients.get(params[0]) || null;
      return null;
    },
    async run(sql, params = []) {
      if (sql.startsWith('INSERT INTO sync_receipts')) {
        const [key, siteId, entityType, entityId, operation, version, result] = params;
        tables.sync_receipts.set(key, { key, siteId, entityType, entityId, operation, version, result });
        return { changes: 1 };
      }
      if (sql.startsWith('INSERT INTO patients')) {
        const idIdx = 0; // payload.id is first column in our upsert
        tables.patients.set(params[idIdx], params);
        return { changes: 1 };
      }
      return { changes: 0 };
    },
    async all() { return []; },
    async transaction(fn) {
      return fn(this);
    },
  };
}

describe('Offline-first sync cycle', () => {
  let container;
  beforeEach(async () => { container = await buildTestContainer(); });
  afterEach(async () => { await container.close(); });

  it('push is a safe no-op when no district node is configured (edge stays fully offline)', async () => {
    const result = await container.services.syncService.push({ id: 'sys', role: 'admin' }, null);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('district_node_not_configured');
  });

  it('queues a patient write locally even though the district node is unreachable', async () => {
    const tech = await createTechnician(container);
    const patient = await registerPatient(container, tech);
    const queued = await container.repos.syncQueueRepository.findBy({ entity_id: patient.id });
    expect(queued.length).toBeGreaterThan(0);
    expect(queued[0].status).toBe('pending');
  });

  it('pushes queued items once a district connection becomes available, and the outbox drains', async () => {
    const tech = await createTechnician(container);
    const patient = await registerPatient(container, tech);

    // Simulate "connectivity restored": attach a district db to the same SyncManager instance.
    container.services.syncManager.districtDb = buildStubDistrictDb();

    const result = await container.services.syncService.push({ id: 'sys', role: 'admin' }, null);
    expect(result.pushed).toBeGreaterThanOrEqual(1);

    const stillPending = await container.repos.syncQueueRepository.findBy({ entity_id: patient.id, status: 'pending' });
    expect(stillPending).toHaveLength(0);
  });

  it('a repeated push of an already-synced item is a no-op (idempotent replay)', async () => {
    const tech = await createTechnician(container);
    await registerPatient(container, tech);
    container.services.syncManager.districtDb = buildStubDistrictDb();

    const first = await container.services.syncService.push({ id: 'sys', role: 'admin' }, null);
    expect(first.pushed).toBeGreaterThanOrEqual(1);

    // Nothing left pending, so a second push should touch zero items.
    const second = await container.services.syncService.push({ id: 'sys', role: 'admin' }, null);
    expect(second.pushed).toBe(0);
    expect(second.failed).toBe(0);
  });
});
