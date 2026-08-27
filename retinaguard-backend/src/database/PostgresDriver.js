'use strict';
const { Pool } = require('pg');

/** Translates the shared `?` placeholder style into Postgres `$n`. */
function toPgSql(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

class PostgresDriver {
  constructor(options) {
    this.dialect = 'postgres';
    this.pool = new Pool(options);
    this.client = null; // set on transaction-scoped clones
  }

  // eslint-disable-next-line class-methods-use-this
  placeholder() { return '?'; }

  async query(sql, params = []) {
    const executor = this.client || this.pool;
    const res = await executor.query(toPgSql(sql), params);
    return { rows: res.rows, rowCount: res.rowCount };
  }

  async transaction(work) {
    const client = await this.pool.connect();
    const scoped = Object.create(PostgresDriver.prototype);
    scoped.dialect = 'postgres';
    scoped.pool = this.pool;
    scoped.client = client;
    try {
      await client.query('BEGIN');
      const result = await work(scoped);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async exec(sql) {
    const executor = this.client || this.pool;
    await executor.query(sql);
  }

  async healthCheck() {
    const { rows } = await this.query('SELECT 1 AS ok');
    return Number(rows[0]?.ok) === 1;
  }

  async close() { await this.pool.end(); }
}

module.exports = PostgresDriver;
module.exports.toPgSql = toPgSql;
