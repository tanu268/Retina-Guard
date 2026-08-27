'use strict';
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const logger = require('../utils/logger');

/**
 * Edge persistence. Synchronous better-sqlite3 wrapped in a promise-returning
 * interface so repositories are written once and can target PostgreSQL on the
 * district node without change (see postgresDatabase.js).
 */
class SqliteDatabase {
  constructor({ filePath }) {
    this.dialect = 'sqlite';
    this.filePath = filePath;
    if (filePath !== ':memory:') {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }
    this.db = new Database(filePath);
    this.db.pragma('journal_mode = WAL');      // survives power loss mid-write
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = FULL');      // rural power reliability > throughput
    this.db.pragma('busy_timeout = 5000');
    logger.debug({ filePath }, 'SQLite opened');
  }

  async run(sql, params = []) {
    const info = this.db.prepare(sql).run(params);
    return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
  }

  async get(sql, params = []) {
    return this.db.prepare(sql).get(params) ?? null;
  }

  async all(sql, params = []) {
    return this.db.prepare(sql).all(params);
  }

  async exec(sql) {
    this.db.exec(sql);
  }

  /**
   * Transactions are synchronous under better-sqlite3. `fn` receives this database
   * and must only perform statements (no awaited I/O) to preserve atomicity.
   */
  async transaction(fn) {
    const tx = this.db.transaction(() => fn(this));
    return tx();
  }

  async healthcheck() {
    const row = this.db.prepare('SELECT 1 AS ok').get();
    return row.ok === 1;
  }

  close() {
    try { this.db.close(); } catch { /* already closed */ }
  }
}

module.exports = SqliteDatabase;
