'use strict';
const BaseRepository = require('./BaseRepository');

class PatientRepository extends BaseRepository {
  constructor({ db }) { super({ db, table: 'patients', softDelete: true }); }

  findByCode(patientCode) { return this.findOneBy('patient_code', patientCode); }

  /** Free-text search across name, code, phone and village for the technician app. */
  async search({ q, district, limit = 20, offset = 0 } = {}) {
    const clauses = ['deleted_at IS NULL'];
    const params = [];
    if (q) {
      clauses.push('(full_name LIKE ? OR patient_code LIKE ? OR phone LIKE ? OR village LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    if (district) { clauses.push('district = ?'); params.push(district); }
    const where = `WHERE ${clauses.join(' AND ')}`;

    const rows = await this.db.all(
      `SELECT * FROM patients ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const total = await this.db.get(`SELECT COUNT(*) AS c FROM patients ${where}`, params);
    return { items: this.mapRows(rows), total: Number(total?.c || 0) };
  }

  /**
   * Duplicate guard before registering a new patient. Wrong-patient linkage is a
   * critical risk in the blueprint risk register.
   */
  async findPossibleDuplicates({ fullName, phone, age }) {
    return this.mapRows(await this.db.all(
      `SELECT * FROM patients
        WHERE deleted_at IS NULL
          AND ((phone IS NOT NULL AND phone = ?) OR (full_name = ? AND (? IS NULL OR ABS(COALESCE(age, -99) - ?) <= 2)))
        LIMIT 10`,
      [phone ?? null, fullName, age ?? null, age ?? -99],
    ));
  }

  /** District-wise patient counts, for the admin overview's regional breakdown. */
  async countByDistrict() {
    const rows = await this.db.all(
      "SELECT COALESCE(district, 'Unspecified') AS district, COUNT(*) AS count " +
      'FROM patients WHERE deleted_at IS NULL GROUP BY district ORDER BY count DESC',
    );
    return rows.map((r) => ({ district: r.district, count: Number(r.count) }));
  }

  async nextPatientCode(sitePrefix) {
    const row = await this.db.get(
      "SELECT COUNT(*) AS c FROM patients WHERE patient_code LIKE ?",
      [`${sitePrefix}-%`],
    );
    return `${sitePrefix}-${String(Number(row?.c || 0) + 1).padStart(6, '0')}`;
  }
}

module.exports = PatientRepository;
