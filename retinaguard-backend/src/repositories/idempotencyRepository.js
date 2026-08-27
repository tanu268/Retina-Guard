'use strict';

/**
 * HTTP-level idempotency store. A technician tapping "Save" twice on a flaky
 * rural link must not create two consultations.
 */
class IdempotencyRepository {
  constructor({ db }) { this.db = db; }

  find(key) { return this.db.get('SELECT * FROM idempotency_keys WHERE key = ?', [key]); }

  async begin({ key, endpoint, userId, requestHash, ttlMs = 24 * 3600 * 1000 }) {
    try {
      await this.db.run(
        `INSERT INTO idempotency_keys (key, endpoint, user_id, request_hash, state, expires_at)
         VALUES (?, ?, ?, ?, 'in_progress', ?)`,
        [key, endpoint, userId ?? null, requestHash, new Date(Date.now() + ttlMs).toISOString()],
      );
      return { fresh: true, record: null };
    } catch {
      return { fresh: false, record: await this.find(key) };
    }
  }

  complete(key, statusCode, body) {
    return this.db.run(
      "UPDATE idempotency_keys SET state = 'completed', status_code = ?, response_body = ? WHERE key = ?",
      [statusCode, JSON.stringify(body), key],
    );
  }

  release(key) { return this.db.run('DELETE FROM idempotency_keys WHERE key = ?', [key]); }

  purgeExpired() {
    return this.db.run('DELETE FROM idempotency_keys WHERE expires_at < ?', [new Date().toISOString()]);
  }
}

module.exports = IdempotencyRepository;
