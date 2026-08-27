const Database = require('better-sqlite3');
const db = new Database('./data/retinaguard.db');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE name='audit_logs'").get();
console.log(schema.sql);
