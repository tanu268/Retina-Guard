'use strict';
const BaseRepository = require('./BaseRepository');

class ConsultationRepository extends BaseRepository {
  constructor({ db }) {
    super({ db, table: 'consultations', boolFields: ['identity_confirmed', 'final_referable'], softDelete: true });
  }

  findByCaseNumber(caseNumber) { return this.findOneBy('case_number', caseNumber); }

  async findWithPatient(id) {
    const row = await this.db.get(
      `SELECT c.*, p.patient_code, p.full_name AS patient_name, p.age, p.gender,
              p.village, p.district, p.state, p.diabetes_type, p.diabetes_duration_years
         FROM consultations c
         JOIN patients p ON p.id = c.patient_id
        WHERE c.id = ? AND c.deleted_at IS NULL`,
      [id],
    );
    return this.fromRow(row);
  }

  incrementRecapture(id) {
    return this.db.run(
      'UPDATE consultations SET recapture_attempts = recapture_attempts + 1 WHERE id = ?',
      [id],
    );
  }

  /**
   * Reviewer queue, ordered by clinical triage priority then age of the case.
   * Backed by the v_review_queue read model.
   */
  async reviewQueue({ priority, status, limit = 20, offset = 0 } = {}) {
    const clauses = [];
    const params = [];
    if (priority) { clauses.push('triage_priority = ?'); params.push(priority); }
    clauses.push(status ? 'status = ?' : "status IN ('awaiting_review','quality_failed')");
    if (status) params.push(status);
    const where = `WHERE ${clauses.join(' AND ')}`;

    const rows = await this.db.all(
      `SELECT * FROM v_review_queue ${where}
        ORDER BY CASE triage_priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
                 consultation_date ASC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const total = await this.db.get(`SELECT COUNT(*) AS c FROM v_review_queue ${where}`, params);
    return { items: this.mapRows(rows), total: Number(total?.c || 0) };
  }

  async statusCounts() {
    const rows = await this.db.all(
      'SELECT status, COUNT(*) AS count FROM consultations WHERE deleted_at IS NULL GROUP BY status',
    );
    return Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
  }
}

module.exports = ConsultationRepository;
