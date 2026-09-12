'use strict';
const BaseRepository = require('./BaseRepository');

class UserRepository extends BaseRepository {
  constructor({ db }) {
    super({ db, table: 'users', boolFields: ['is_active'], softDelete: true });
  }

  findByUsername(username) { return this.findOneBy('username', username); }

  async listActive({ role, limit = 100, offset = 0 } = {}) {
    return this.findBy({ role, is_active: 1 }, { orderBy: 'full_name ASC', limit, offset });
  }

  /**
   * All users including disabled ones, for the admin Users page. listActive
   * filters to is_active = 1, which would hide a disabled account entirely —
   * and an account you cannot see is one you cannot re-enable.
   */
  async listAll({ role, limit = 100, offset = 0 } = {}) {
    return this.findBy({ role }, { orderBy: 'is_active DESC, full_name ASC', limit, offset });
  }

  async recordLoginSuccess(id) {
    await this.db.run(
      'UPDATE users SET last_login_at = ?, failed_logins = 0, locked_until = NULL WHERE id = ?',
      [new Date().toISOString(), id],
    );
  }

  /** Progressive lockout after repeated failures — brute-force resistance offline. */
  async recordLoginFailure(id, { maxFailures = 5, lockMinutes = 15 } = {}) {
    const user = await this.findById(id);
    if (!user) return null;
    const failed = (user.failed_logins || 0) + 1;
    const lockedUntil = failed >= maxFailures
      ? new Date(Date.now() + lockMinutes * 60000).toISOString()
      : null;
    await this.db.run('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?',
      [failed, lockedUntil, id]);
    return { failed, lockedUntil };
  }

  isLocked(user) {
    return Boolean(user?.locked_until && new Date(user.locked_until) > new Date());
  }
}

module.exports = UserRepository;
