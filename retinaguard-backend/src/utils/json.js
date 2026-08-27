'use strict';
/** SQLite and Postgres both store structured columns as TEXT — one codec for both. */
const encode = (value) => (value === undefined || value === null ? null : JSON.stringify(value));
const decode = (value, fallback = null) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};
module.exports = { encode, decode };
