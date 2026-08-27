const { buildContainer } = require('./src/container');
(async () => {
  const c = await buildContainer();
  const triggers = await c.edge.all("SELECT name, sql FROM sqlite_master WHERE type='trigger' AND name LIKE 'trg_audit%'");
  console.log(JSON.stringify(triggers, null, 2));
  const entry = await c.repos.auditRepository.append({ action: 'test', entity_type: 'x', entity_id: '1', case_id: 'v2' });
  console.log('Inserted entry, sequence:', entry.sequence);
  try {
    await c.edge.run("UPDATE audit_logs SET action='hacked' WHERE id=?", [entry.id]);
    console.log('UPDATE SUCCEEDED — trigger is not blocking, this is broken');
  } catch(e) {
    console.log('UPDATE blocked:', e.message);
  }
  await c.close();
})();
