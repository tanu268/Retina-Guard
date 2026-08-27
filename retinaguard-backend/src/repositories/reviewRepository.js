'use strict';
const BaseRepository = require('./BaseRepository');

class ReviewRepository extends BaseRepository {
  constructor({ db }) { super({ db, table: 'reviews', boolFields: ['agreement'] }); }

  findByConsultation(consultationId) { return this.findOneBy('consultation_id', consultationId); }

  listByReviewer(reviewerId, { limit = 50, offset = 0 } = {}) {
    return this.findBy({ reviewer_id: reviewerId }, { orderBy: 'review_completed_at DESC', limit, offset });
  }

  /**
   * Reviewer workload metrics: median review time and AI/human agreement rate.
   * Feeds both the Simulink model and the human-workflow test track.
   */
  async workloadStats({ since } = {}) {
    const params = [];
    let where = '';
    if (since) { where = 'WHERE review_completed_at >= ?'; params.push(since); }
    const row = await this.db.get(
      `SELECT COUNT(*) AS total,
              AVG(duration_seconds) AS avg_seconds,
              SUM(CASE WHEN agreement = 1 THEN 1 ELSE 0 END) AS agreed,
              SUM(CASE WHEN decision = 'refer' THEN 1 ELSE 0 END) AS referred
         FROM reviews ${where}`,
      params,
    );
    const total = Number(row?.total || 0);
    return {
      total,
      avgReviewSeconds: row?.avg_seconds != null ? Number(row.avg_seconds) : null,
      agreementRate: total ? Number(row.agreed) / total : null,
      referralRate: total ? Number(row.referred) / total : null,
    };
  }
}

module.exports = ReviewRepository;
