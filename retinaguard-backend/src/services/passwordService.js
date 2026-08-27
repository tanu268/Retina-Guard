'use strict';
const bcrypt = require('bcryptjs');

class PasswordService {
  constructor({ config }) { this.rounds = config.auth.bcryptRounds; }

  hash(plain) { return bcrypt.hash(plain, this.rounds); }

  compare(plain, hash) { return bcrypt.compare(plain, hash); }

  /**
   * Policy check. Rural PHC accounts are shared-device accounts, so a weak
   * password is a realistic risk rather than a theoretical one.
   */
  validateStrength(password) {
    const issues = [];
    if (!password || password.length < 10) issues.push('Must be at least 10 characters.');
    if (!/[A-Z]/.test(password)) issues.push('Must contain an uppercase letter.');
    if (!/[a-z]/.test(password)) issues.push('Must contain a lowercase letter.');
    if (!/[0-9]/.test(password)) issues.push('Must contain a digit.');
    if (/^(password|retinaguard|123456|qwerty)/i.test(password || '')) issues.push('Too predictable.');
    return { valid: issues.length === 0, issues };
  }
}

module.exports = PasswordService;
