'use strict';
const crypto = require('crypto');

/** RFC 4122 v4 UUID — the canonical primary key across edge and district nodes. */
const uuid = () => crypto.randomUUID();

/**
 * Idempotency keys are derived, not random, so the same logical write produced by a
 * retrying edge node maps to the same key (Blueprint §08 — idempotent sync).
 */
function deterministicKey(...parts) {
  return crypto.createHash('sha256').update(parts.map(String).join('|')).digest('hex');
}

/** Human-facing case number, e.g. RG-PHCINDORE01-20260827-4F2A. */
function caseNumber(siteId, date = new Date()) {
  const site = String(siteId).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12);
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `RG-${site}-${ymd}-${rand}`;
}

function reportNumber(siteId, date = new Date()) {
  return caseNumber(siteId, date).replace(/^RG-/, 'RPT-');
}

/** Opaque, non-guessable token embedded in the report QR for offline verification. */
const verificationToken = () => crypto.randomBytes(24).toString('base64url');

module.exports = { uuid, deterministicKey, caseNumber, reportNumber, verificationToken };
