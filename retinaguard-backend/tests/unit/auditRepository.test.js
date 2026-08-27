'use strict';
const { buildTestContainer } = require('../helpers/buildTestContainer');

describe('AuditRepository (append-only hash chain)', () => {
  let container;
  beforeEach(async () => { container = await buildTestContainer(); });
  afterEach(async () => { await container.close(); });

  it('appends entries with a linked prev_hash chain', async () => {
    const repo = container.repos.auditRepository;
    const e1 = await repo.append({ action: 'test.one', entity_type: 'x', entity_id: '1', case_id: 'case1' });
    const e2 = await repo.append({ action: 'test.two', entity_type: 'x', entity_id: '1', case_id: 'case1' });
    expect(e2.prev_hash).toBe(e1.hash);
  });

  it('verifyChain reports valid for an untampered case', async () => {
    const repo = container.repos.auditRepository;
    await repo.append({ action: 'a', entity_type: 'x', entity_id: '1', case_id: 'case2' });
    await repo.append({ action: 'b', entity_type: 'x', entity_id: '1', case_id: 'case2' });
    const result = await repo.verifyChain({ caseId: 'case2' });
    expect(result.valid).toBe(true);
    expect(result.entries).toBe(2);
  });

  it('the audit_logs table rejects UPDATE at the SQL layer (immutability trigger)', async () => {
    const repo = container.repos.auditRepository;
    const entry = await repo.append({ action: 'a', entity_type: 'x', entity_id: '1', case_id: 'case4' });
    try {
      await container.edge.run("UPDATE audit_logs SET action = 'hacked' WHERE id = ?", [entry.id]);
      throw new Error('Expected UPDATE to throw an error, but it succeeded.');
    } catch (err) {
      expect(err.message).toMatch(/append-only/i);
    }
  });

  it('the audit_logs table rejects DELETE at the SQL layer', async () => {
    const repo = container.repos.auditRepository;
    const entry = await repo.append({ action: 'a', entity_type: 'x', entity_id: '1', case_id: 'case5' });
    try {
      await container.edge.run('DELETE FROM audit_logs WHERE id = ?', [entry.id]);
      throw new Error('Expected DELETE to throw an error, but it succeeded.');
    } catch (err) {
      expect(err.message).toMatch(/append-only/i);
    }
  });

  it('verifyChain detects tampering (invalid prev_hash or payload)', async () => {
    const repo = container.repos.auditRepository;
    const e1 = await repo.append({ action: 'a', entity_type: 'x', entity_id: '1', case_id: 'case6' });
    const e2 = await repo.append({ action: 'b', entity_type: 'x', entity_id: '1', case_id: 'case6' });
    
    // Disable triggers temporarily in SQLite for this test connection only
    // Actually, SQLite doesn't let us disable triggers per-connection easily,
    // so we can use a direct repository method override just to test the logic of verifyChain.
    // verifyChain fetches rows using this.db.all(...). We can mock the db.all call just for this test!
    const originalDbAll = repo.db.all.bind(repo.db);
    repo.db.all = async (sql, params) => {
      const rows = await originalDbAll(sql, params);
      if (rows.length > 0) {
        // Tamper with the hash of the second row in memory before verifyChain sees it
        rows[1].hash = 'tampered_hash_that_is_invalid';
      }
      return rows;
    };

    try {
      const result = await repo.verifyChain({ caseId: 'case6' });
      expect(result.valid).toBe(false);
    } finally {
      repo.db.all = originalDbAll;
    }
  });

});
