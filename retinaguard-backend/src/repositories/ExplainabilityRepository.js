'use strict';
const BaseRepository = require('./BaseRepository');

class ExplainabilityRepository extends BaseRepository {
  constructor({ db }) { super({ db, table: 'explainability', jsonFields: ['payload'] }); }
  findByAnalysis(analysisId) { return this.findOneBy({ analysis_id: analysisId }); }

  listByAnalysis(analysisId) {
    return this.findBy({ analysis_id: analysisId }, { orderBy: 'layer ASC' });
  }

  async replaceForAnalysis(analysisId, layers) {
    const { uuid } = require('../utils/ids');
    await this.db.transaction((db) => {
      db.db.prepare('DELETE FROM explainability WHERE analysis_id = ?').run(analysisId);
      const stmt = db.db.prepare('INSERT INTO explainability (id, analysis_id, layer, artifact_path, artifact_type, payload) VALUES (?, ?, ?, ?, ?, ?)');
      for (const layer of layers) {
        stmt.run(uuid(), analysisId, layer.layer, layer.artifact_path || null, layer.artifact_type || null, layer.payload ? JSON.stringify(layer.payload) : null);
      }
    });
  }
}
module.exports = ExplainabilityRepository;
