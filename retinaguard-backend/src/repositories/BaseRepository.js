'use strict';
const { uuid } = require('../utils/ids');

/**
 * Generic data-access base. Repositories know SQL; services know rules.
 * `jsonFields` are transparently serialised/parsed so callers work with objects.
 * `softDelete` toggles `deleted_at IS NULL` filtering.
 */
class BaseRepository {
  constructor({ db, table, jsonFields = [], boolFields = [], softDelete = false }) {
    if (!db) throw new Error(`${table}: database dependency is required`);
    this.db = db;
    this.table = table;
    this.jsonFields = jsonFields;
    this.boolFields = boolFields;
    this.softDelete = softDelete;
  }

  // ── serialisation ────────────────────────────────────────────────────────
  toRow(entity) {
    const row = { ...entity };
    for (const f of this.jsonFields) {
      if (row[f] !== undefined && row[f] !== null && typeof row[f] !== 'string') {
        row[f] = JSON.stringify(row[f]);
      }
    }
    for (const f of this.boolFields) {
      if (row[f] !== undefined && row[f] !== null) row[f] = row[f] ? 1 : 0;
    }
    return row;
  }

  fromRow(row) {
    if (!row) return null;
    const out = { ...row };
    for (const f of this.jsonFields) {
      if (typeof out[f] === 'string') {
        try { out[f] = JSON.parse(out[f]); } catch { /* keep raw text */ }
      }
    }
    for (const f of this.boolFields) {
      if (out[f] !== undefined && out[f] !== null) out[f] = Boolean(out[f]);
    }
    return out;
  }

  mapRows(rows) { return rows.map((r) => this.fromRow(r)); }

  // ── writes ───────────────────────────────────────────────────────────────
  async create(entity, executor = this.db) {
    const row = this.toRow({ id: entity.id || uuid(), ...entity });
    const keys = Object.keys(row).filter((k) => row[k] !== undefined);
    const sql = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
    await executor.run(sql, keys.map((k) => row[k]));
    return this.findById(row.id, { executor });
  }

  async update(id, patch, executor = this.db) {
    const row = this.toRow(patch);
    const keys = Object.keys(row).filter((k) => k !== 'id' && row[k] !== undefined);
    if (keys.length === 0) return this.findById(id, { executor });
    const sql = `UPDATE ${this.table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`;
    await executor.run(sql, [...keys.map((k) => row[k]), id]);
    return this.findById(id, { executor, includeDeleted: true });
  }

  /** Optimistic concurrency: only applies when the stored version matches. */
  async updateWithVersion(id, patch, expectedVersion, executor = this.db) {
    const row = this.toRow({ ...patch, version: expectedVersion + 1 });
    const keys = Object.keys(row).filter((k) => k !== 'id' && row[k] !== undefined);
    const sql = `UPDATE ${this.table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ? AND version = ?`;
    const res = await executor.run(sql, [...keys.map((k) => row[k]), id, expectedVersion]);
    return res.changes > 0 ? this.findById(id, { executor }) : null;
  }

  async softDeleteById(id, executor = this.db) {
    const res = await executor.run(
      `UPDATE ${this.table} SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`,
      [new Date().toISOString(), id],
    );
    return res.changes > 0;
  }

  async hardDelete(id, executor = this.db) {
    const res = await executor.run(`DELETE FROM ${this.table} WHERE id = ?`, [id]);
    return res.changes > 0;
  }

  // ── reads ────────────────────────────────────────────────────────────────
  async findById(id, { executor = this.db, includeDeleted = false } = {}) {
    const guard = this.softDelete && !includeDeleted ? ' AND deleted_at IS NULL' : '';
    return this.fromRow(await executor.get(`SELECT * FROM ${this.table} WHERE id = ?${guard}`, [id]));
  }

  async findOneBy(field, value, { executor = this.db, includeDeleted = false } = {}) {
    const guard = this.softDelete && !includeDeleted ? ' AND deleted_at IS NULL' : '';
    return this.fromRow(await executor.get(`SELECT * FROM ${this.table} WHERE ${field} = ?${guard}`, [value]));
  }

  async findBy(criteria = {}, { orderBy = 'created_at DESC', limit, offset, executor = this.db, includeDeleted = false } = {}) {
    const { where, params } = this.#buildWhere(criteria, includeDeleted);
    let sql = `SELECT * FROM ${this.table} ${where} ORDER BY ${orderBy}`;
    if (limit !== undefined) { sql += ' LIMIT ?'; params.push(limit); }
    if (offset !== undefined) { sql += ' OFFSET ?'; params.push(offset); }
    return this.mapRows(await executor.all(sql, params));
  }

  async count(criteria = {}, { executor = this.db, includeDeleted = false } = {}) {
    const { where, params } = this.#buildWhere(criteria, includeDeleted);
    const row = await executor.get(`SELECT COUNT(*) AS c FROM ${this.table} ${where}`, params);
    return Number(row?.c || 0);
  }

  async exists(id, opts = {}) { return (await this.findById(id, opts)) !== null; }

  #buildWhere(criteria, includeDeleted) {
    const clauses = [];
    const params = [];
    for (const [k, v] of Object.entries(criteria)) {
      if (v === undefined) continue;
      if (v === null) { clauses.push(`${k} IS NULL`); continue; }
      if (Array.isArray(v)) {
        if (v.length === 0) { clauses.push('1 = 0'); continue; }
        clauses.push(`${k} IN (${v.map(() => '?').join(', ')})`);
        params.push(...v.map((x) => (typeof x === 'boolean' ? Number(x) : x)));
        continue;
      }
      clauses.push(`${k} = ?`);
      params.push(typeof v === 'boolean' ? Number(v) : v);
    }
    if (this.softDelete && !includeDeleted) clauses.push('deleted_at IS NULL');
    return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
  }
}

module.exports = BaseRepository;
