'use strict';
const { buildTestContainer } = require('../helpers/buildTestContainer');

describe('SyncQueueRepository (offline outbox)', () => {
  let container;
  beforeEach(async () => { container = await buildTestContainer(); });
  afterEach(async () => { await container.close(); });

  it('enqueue is idempotent for the same key', async () => {
    const repo = container.repos.syncQueueRepository;
    const item = { entity_type: 'patient', entity_id: 'p1', operation: 'create', payload: { id: 'p1' }, idempotency_key: 'k1' };
    const first = await repo.enqueue(item);
    const second = await repo.enqueue({ ...item, payload: { id: 'p1', updated: true } });
    expect(second.id).toBe(first.id);
    const all = await repo.findBy({});
    expect(all).toHaveLength(1);
  });

  it('claimBatch marks items in_flight and excludes them from a second claim', async () => {
    const repo = container.repos.syncQueueRepository;
    await repo.enqueue({ entity_type: 'patient', entity_id: 'p2', operation: 'create', payload: { id: 'p2' }, idempotency_key: 'k2' });
    const batch1 = await repo.claimBatch(10);
    expect(batch1).toHaveLength(1);
    const batch2 = await repo.claimBatch(10);
    expect(batch2).toHaveLength(0);
  });

  it('markFailed schedules retry with backoff until max_attempts is exhausted', async () => {
    const repo = container.repos.syncQueueRepository;
    const created = await repo.enqueue({
      entity_type: 'patient', entity_id: 'p3', operation: 'create', payload: { id: 'p3' },
      idempotency_key: 'k3', max_attempts: 2,
    });
    await repo.markFailed(created.id, 'network error', 10);
    let row = await repo.findById(created.id);
    expect(row.status).toBe('pending');
    expect(row.attempts).toBe(1);

    await repo.markFailed(created.id, 'network error again', 10);
    row = await repo.findById(created.id);
    expect(row.status).toBe('failed');
    expect(row.attempts).toBe(2);
  });

  it('requeueStale releases items stuck in_flight', async () => {
    const repo = container.repos.syncQueueRepository;
    const created = await repo.enqueue({ entity_type: 'patient', entity_id: 'p4', operation: 'create', payload: { id: 'p4' }, idempotency_key: 'k4' });
    await repo.claimBatch(10);
    await container.edge.run("UPDATE sync_queue SET updated_at = datetime('now', '-10 minutes') WHERE id = ?", [created.id]);
    await repo.requeueStale(new Date(Date.now() - 5 * 60000).toISOString());
    const row = await repo.findById(created.id);
    expect(row.status).toBe('pending');
  });

  it('summary reports counts by status and entity', async () => {
    const repo = container.repos.syncQueueRepository;
    await repo.enqueue({ entity_type: 'patient', entity_id: 'p5', operation: 'create', payload: {}, idempotency_key: 'k5' });
    const summary = await repo.summary();
    expect(summary.byStatus.pending).toBeGreaterThanOrEqual(1);
  });
});
