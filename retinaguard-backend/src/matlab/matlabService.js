'use strict';
const path = require('path');
const MockMatlabAdapter = require('./adapters/mockAdapter');
const MatlabCliAdapter = require('./adapters/cliAdapter');
const {
  PIPELINE_STAGES, ABSTAIN_REASONS, gradeByCode,
  assertGradingResponse, assertQualityResponse,
} = require('./contracts');
const { MatlabError } = require('../utils/errors');
const { stopwatch } = require('../utils/time');
const logger = require('../utils/logger');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MatlabService — the single boundary between HTTP and the imaging pipeline.
 *
 * Responsibilities:
 *   · select the adapter (mock ⇄ cli) from configuration
 *   · validate every adapter response against contracts.js
 *   · time every stage (measured latency feeds the SimEvents capacity model)
 *   · convert any stage failure into an abstention, never a guessed grade
 * ═══════════════════════════════════════════════════════════════════════════
 */
class MatlabService {
  constructor({ config, adapter }) {
    this.config = config;
    this.adapter = adapter || (config.matlab.adapter === 'cli'
      ? new MatlabCliAdapter({ config })
      : new MockMatlabAdapter({ config }));
    logger.info({ adapter: this.adapter.name }, 'MATLAB adapter selected');
  }

  // ── individual stages (exposed for unit testing and partial re-runs) ──────

  async qualityAssessment(req) {
    const res = await this.adapter.qualityAssessment(req);
    const errors = assertQualityResponse(res);
    if (errors.length) throw new MatlabError('Invalid quality response from MATLAB', { errors });
    return res;
  }

  preprocessImage(req)  { return this.adapter.preprocessImage(req); }
  detectAnatomy(req)    { return this.adapter.detectAnatomy(req); }
  detectLesions(req)    { return this.adapter.detectLesions(req); }

  async gradeDR(req) {
    const res = await this.adapter.gradeDR(req);
    const errors = assertGradingResponse(res);
    if (errors.length) throw new MatlabError('Invalid grading response from MATLAB', { errors });
    return res;
  }

  generateGradCAM(req)  { return this.adapter.generateGradCAM(req); }
  health()              { return this.adapter.health(); }

  /**
   * Full screening pipeline for one image.
   * Returns a normalised result the analysis service persists verbatim.
   */
  async runPipeline({ imagePath, sha256, gradcamOutputPath, qualityGrade }) {
    const total = stopwatch();
    const timings = {};
    const warnings = [];
    const stage = async (name, fn) => {
      const lap = stopwatch();
      try {
        const out = await fn();
        timings[name] = Number((out?.durationMs ?? lap()).toFixed(2));
        return out;
      } catch (err) {
        timings[name] = Number(lap().toFixed(2));
        throw err;
      }
    };

    try {
      const quality = qualityGrade
        ? { qualityGrade, qualityScore: null, gradeable: qualityGrade !== 'C', reasons: [] }
        : await stage('quality_assessment', () => this.qualityAssessment({ imagePath, sha256 }));

      // A stage-2 refusal is a legitimate outcome, not an error.
      if (!quality.gradeable) {
        return this.#abstention({
          reason: 'UNGRADEABLE_IMAGE', quality, timings, totalMs: total(), warnings,
        });
      }

      // No diagnostic model integrated on this adapter: abstain cleanly before
      // any of the diagnostic stages run, rather than let them fabricate a
      // grade, lesion set or attention map. Quality assessment above still
      // ran for real (it gates the capture workflow's recapture logic), but
      // nothing downstream of it executes. See mockAdapter.js.
      if (this.adapter.modelIntegrated === false) {
        return this.#abstention({
          reason: 'MODEL_NOT_INTEGRATED', quality, timings, totalMs: total(), warnings,
        });
      }

      const preprocess = await stage('preprocess', () => this.preprocessImage({ imagePath, sha256 }));
      const anatomy = await stage('anatomy_detection', () => this.detectAnatomy({ imagePath, sha256 }));
      const grading = await stage('dr_grading', () => this.gradeDR({
        imagePath: preprocess.preprocessedPath, sha256, qualityGrade: quality.qualityGrade,
      }));
      const lesionEvidence = await stage('lesion_detection', () => this.detectLesions({
        imagePath: preprocess.preprocessedPath, sha256, severityHint: grading.drGradeCode,
      }));
      const gradcam = await stage('gradcam', () => this.generateGradCAM({
        imagePath: preprocess.preprocessedPath,
        sha256,
        outputPath: gradcamOutputPath,
        drGradeCode: grading.drGradeCode,
      }));

      if (!anatomy.opticDisc?.detected) warnings.push('Optic disc not localised; anatomical context is limited.');
      if (quality.qualityGrade === 'B') warnings.push('Borderline image quality — interpret evidence with caution.');

      return {
        status: 'completed',
        quality,
        preprocess,
        anatomy,
        lesionEvidence,
        grading,
        gradcam,
        gradeLabel: gradeByCode(grading.drGradeCode)?.label ?? null,
        stageTimingsMs: { ...timings, total: Number(total().toFixed(2)) },
        warnings,
        adapter: this.adapter.name,
      };
    } catch (err) {
      logger.error({ err: err.message, sha256 }, 'Pipeline stage failure — routing to human review');
      return this.#abstention({
        reason: 'STAGE_FAILURE',
        timings,
        totalMs: total(),
        warnings: [...warnings, err.message],
        error: err.message,
      });
    }
  }

  #abstention({ reason, quality = null, timings = {}, totalMs = 0, warnings = [], error = null }) {
    return {
      status: 'abstained',
      abstainReason: reason,
      abstainMessage: ABSTAIN_REASONS[reason],
      quality,
      grading: null,
      anatomy: null,
      lesionEvidence: null,
      gradcam: null,
      gradeLabel: null,
      stageTimingsMs: { ...timings, total: Number(totalMs.toFixed(2)) },
      warnings,
      error,
      adapter: this.adapter.name,
    };
  }

  static get STAGES() { return PIPELINE_STAGES; }

  /** Where Grad-CAM artefacts are written for a given analysis. */
  static gradcamPath(uploadDir, analysisId) {
    return path.join(uploadDir, 'gradcam', `${analysisId}.png`);
  }
}

module.exports = MatlabService;
