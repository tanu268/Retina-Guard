'use strict';
const BaseRepository = require('./BaseRepository');

class AnalysisRepository extends BaseRepository {
  constructor({ db }) {
    super({
      db,
      table: 'analysis_results',
      jsonFields: ['grade_probabilities', 'anatomy', 'lesions', 'stage_timings_ms', 'warnings'],
      boolFields: ['referable', 'abstained', 'audit_sampled'],
    });
  }

  listByConsultation(consultationId) {
    return this.findBy({ consultation_id: consultationId }, { orderBy: 'created_at DESC' });
  }

  latestForImage(imageId) {
    return this.db.get(
      'SELECT * FROM analysis_results WHERE image_id = ? ORDER BY created_at DESC LIMIT 1',
      [imageId],
    ).then((r) => this.fromRow(r));
  }

  /**
   * Measured per-stage latency distributions. These are the inputs the SimEvents
   * district capacity model consumes — the blueprint forbids invented numbers.
   */
  async stageTimingSamples({ limit = 500 } = {}) {
    const rows = await this.db.all(
      `SELECT stage_timings_ms FROM analysis_results
        WHERE status IN ('completed','abstained') AND stage_timings_ms IS NOT NULL
        ORDER BY created_at DESC LIMIT ?`,
      [limit],
    );
    return rows.map((r) => { try { return JSON.parse(r.stage_timings_ms); } catch { return null; } })
      .filter(Boolean);
  }

  async gradeDistribution() {
    const rows = await this.db.all(
      `SELECT dr_grade_code, COUNT(*) AS count FROM analysis_results
        WHERE status = 'completed' GROUP BY dr_grade_code ORDER BY dr_grade_code`,
    );
    return rows.map((r) => ({ grade: Number(r.dr_grade_code), count: Number(r.count) }));
  }
}

module.exports = AnalysisRepository;
