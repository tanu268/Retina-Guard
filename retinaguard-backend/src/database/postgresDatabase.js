'use strict';
const { Pool } = require('pg');
const logger = require('../utils/logger');

/** Translate `?` placeholders (SQLite dialect) into `$1..$n` for PostgreSQL. */
function toPgPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/**
 * District persistence. Only instantiated when DISTRICT_SYNC_ENABLED=true.
 * The edge node must never require this to screen a patient (Blueprint §08).
 */
class PostgresDatabase {
  constructor(opts) {
    this.dialect = 'postgres';
    this.pool = new Pool({
      host: opts.host,
      port: opts.port,
      database: opts.database,
      user: opts.user,
      password: opts.password,
      ssl: opts.ssl ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    this.pool.on('error', (err) => logger.error({ err }, 'PostgreSQL pool error'));
  }

  async run(sql, params = []) {
    const res = await this.pool.query(toPgPlaceholders(sql), params);
    return { changes: res.rowCount, rows: res.rows };
  }

  async get(sql, params = []) {
    const res = await this.pool.query(toPgPlaceholders(sql), params);
    return res.rows[0] ?? null;
  }

  async all(sql, params = []) {
    const res = await this.pool.query(toPgPlaceholders(sql), params);
    return res.rows;
  }

  async exec(sql) {
    await this.pool.query(sql);
  }

  async transaction(fn) {
    const client = await this.pool.connect();
    const scoped = {
      dialect: 'postgres',
      run: async (sql, p = []) => {
        const r = await client.query(toPgPlaceholders(sql), p);
        return { changes: r.rowCount, rows: r.rows };
      },
      get: async (sql, p = []) => (await client.query(toPgPlaceholders(sql), p)).rows[0] ?? null,
      all: async (sql, p = []) => (await client.query(toPgPlaceholders(sql), p)).rows,
    };
    try {
      await client.query('BEGIN');
      const result = await fn(scoped);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async healthcheck() {
    const row = await this.get('SELECT 1 AS ok');
    return Number(row?.ok) === 1;
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = PostgresDatabase;
module.exports.toPgPlaceholders = toPgPlaceholders;
