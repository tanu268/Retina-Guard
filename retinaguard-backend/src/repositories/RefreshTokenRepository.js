'use strict';
const BaseRepository = require('./BaseRepository');
const { nowIso } = require('../utils/time');

class RefreshTokenRepository extends BaseRepository {
  constructor({ db }) { super({ db, table: 'refresh_tokens', softDelete: false }); }

  findActiveByHash(tokenHash) {
    return this.db.get(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?',
      [tokenHash, new Date().toISOString()],
    ).then((row) => this.fromRow(row));
  }

  async revoke(id, replacedBy = null) {
    const res = await this.db.run(
      'UPDATE refresh_tokens SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL',
      [nowIso(), id]
    );
    return res.changes > 0;
  }

  async revokeAllForUser(userId) {
    const res = await this.db.run(
      'UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL',
      [nowIso(), userId]
    );
    return res.changes;
  }

  async purgeExpired() {
    const res = await this.db.run('DELETE FROM refresh_tokens WHERE expires_at < ?', [nowIso()]);
    return res.changes;
  }
}
module.exports = RefreshTokenRepository;
