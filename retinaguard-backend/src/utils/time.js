'use strict';

const nowIso = () => new Date().toISOString();
const isoIn = (ms) => new Date(Date.now() + ms).toISOString();

/** Exponential backoff with full jitter, capped at 30 minutes. */
function backoffMs(attempt, base = 5000, cap = 30 * 60 * 1000) {
  const exp = Math.min(cap, base * 2 ** Math.max(0, attempt - 1));
  return Math.floor(Math.random() * exp);
}

/** Monotonic stage timer used to feed measured latencies into the SimEvents model. */
function stopwatch() {
  const start = process.hrtime.bigint();
  return () => Number(process.hrtime.bigint() - start) / 1e6; // milliseconds
}

module.exports = { nowIso, isoIn, backoffMs, stopwatch };
