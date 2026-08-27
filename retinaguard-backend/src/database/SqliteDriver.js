'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

/**
 * better-sqlite3 is synchronous; we wrap it in the same async surface as the
 * Postgres driver so repositories are written once and run on both nodes.
 */
class SqliteDriver {
  constructor({ file }) {
    this.dialect = 'sqlite';
    this.file = file;
    if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new Database(file);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');
  }

  // eslint-disable-next-line class-methods-use-this
  placeholder() { return '?'; }

  async query(sql, params = []) {
    const stmt = this.db.prepare(sql);
    if (stmt.reader) {
      const rows = stmt.all(...params);
      return { rows, rowCount: rows.length };
    }
    const info = stmt.run(...params);
    return { rows: [], rowCount: info.changes, lastInsertRowid: info.lastInsertRowid };
  }

  /**
   * better-sqlite3 cannot run async work inside its own `transaction()` helper,
   * so we drive BEGIN/COMMIT explicitly. The driver is single-connection, which
   * is correct for a single-process edge node.
   */
  async transaction(work) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = await work(this);
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      try { this.db.exec('ROLLBACK'); } catch { /* already rolled back */ }
      throw err;
    }
  }

  async exec(sql) { this.db.exec(sql); }

  async healthCheck() {
    const { rows } = await this.query('SELECT 1 AS ok');
    return rows[0]?.ok === 1;
  }

  async close() { this.db.close(); }
}

module.exports = SqliteDriver;
