'use strict';
const BaseRepository = require('./BaseRepository');

class ReportRepository extends BaseRepository {
  constructor({ db }) { super({ db, table: 'reports', jsonFields: ['json_payload'] }); }

  findByConsultation(consultationId) {
    return this.db.get(
      "SELECT * FROM reports WHERE consultation_id = ? AND status <> 'superseded' ORDER BY generated_at DESC LIMIT 1",
      [consultationId],
    ).then((r) => this.fromRow(r));
  }

  findByQrToken(token) { return this.findOneBy('qr_token', token); }

  findByNumber(reportNumber) { return this.findOneBy('report_number', reportNumber); }

  async nextReportNumber(sitePrefix) {
    const row = await this.db.get(
      "SELECT COUNT(*) AS c FROM reports WHERE report_number LIKE ?",
      [`${sitePrefix}-%`],
    );
    return `${sitePrefix}-${String(Number(row?.c || 0) + 1).padStart(6, '0')}`;
  }

  supersedeForConsultation(consultationId, keepId) {
    return this.db.run(
      "UPDATE reports SET status = 'superseded' WHERE consultation_id = ? AND id <> ?",
      [consultationId, keepId],
    );
  }
}

module.exports = ReportRepository;
