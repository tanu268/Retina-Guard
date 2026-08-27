'use strict';
const BaseRepository = require('./BaseRepository');

class ImageRepository extends BaseRepository {
  constructor({ db }) {
    super({ db, table: 'images', jsonFields: ['quality_reasons'], softDelete: true });
  }

  listByConsultation(consultationId) {
    return this.findBy({ consultation_id: consultationId }, { orderBy: 'capture_attempt ASC, created_at ASC' });
  }

  findBySha(sha256) { return this.findOneBy('sha256', sha256); }

  /** Latest gradeable (A/B) image for a given eye. */
  async latestAcceptedForEye(consultationId, laterality) {
    const row = await this.db.get(
      `SELECT * FROM images
        WHERE consultation_id = ? AND laterality = ? AND deleted_at IS NULL
          AND quality_grade IN ('A','B')
        ORDER BY capture_attempt DESC LIMIT 1`,
      [consultationId, laterality],
    );
    return this.fromRow(row);
  }

  async attemptCount(consultationId, laterality) {
    const row = await this.db.get(
      'SELECT COUNT(*) AS c FROM images WHERE consultation_id = ? AND laterality = ? AND deleted_at IS NULL',
      [consultationId, laterality],
    );
    return Number(row?.c || 0);
  }

  supersedePrevious(consultationId, laterality, keepImageId) {
    return this.db.run(
      `UPDATE images SET status = 'superseded'
        WHERE consultation_id = ? AND laterality = ? AND id <> ? AND status NOT IN ('analysed','deleted')`,
      [consultationId, laterality, keepImageId],
    );
  }
}

module.exports = ImageRepository;
