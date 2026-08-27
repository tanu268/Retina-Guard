'use strict';
const path = require('path');
const { uuid } = require('../utils/ids');
const { NotFoundError, ClinicalSafetyError } = require('../utils/errors');
const AuditService = require('./auditService');
const { gradeByCode } = require('../matlab/contracts');

/**
 * Orchestrates the AI screening pipeline for one image and persists a
 * clinically-safe result: either a calibrated grade, or an explicit abstention
 * that routes the case to human review. Nothing in between is allowed to reach
 * the reviewer queue.
 */
class AnalysisService {
  constructor({
    analysisRepository, explainabilityRepository, imageRepository, consultationRepository,
    matlabService, clinicalSafetyService, storageService, auditService, syncService, config, eventBus,
  }) {
    this.repo = analysisRepository;
    this.explain = explainabilityRepository;
    this.images = imageRepository;
    this.consultations = consultationRepository;
    this.matlab = matlabService;
    this.safety = clinicalSafetyService;
    this.storage = storageService;
    this.audit = auditService;
    this.sync = syncService;
    this.config = config;
    this.eventBus = eventBus;
  }

  async run({ imageId }, actor, req) {
    const image = await this.images.findById(imageId);
    if (!image) throw new NotFoundError('Image');
    if (image.quality_grade === 'C') {
      throw new ClinicalSafetyError('Cannot analyse an image graded C (unreadable). Recapture is required.');
    }

    const analysis = await this.repo.create({
      id: uuid(),
      image_id: image.id,
      consultation_id: image.consultation_id,
      status: 'running',
      model_version: this.config.matlab.modelVersion,
      model_hash: this.config.matlab.modelHash,
      preprocessing_hash: this.config.matlab.preprocessingHash,
      started_at: new Date().toISOString(),
    });
    await this.audit.record({
      action: AuditService.ACTIONS.ANALYSIS_STARTED, entityType: 'analysis_result', entityId: analysis.id,
      caseId: image.consultation_id, actor, req,
    });

    const gradcamOutputPath = path.join(this.storage.root, 'gradcam', `${analysis.id}.png`);
    const pipeline = await this.matlab.runPipeline({
      imagePath: this.storage.absolute(image.file_path),
      sha256: image.sha256,
      gradcamOutputPath,
      qualityGrade: image.quality_grade,
    });

    if (pipeline.status === 'abstained') {
      return this.#persistAbstention({ analysis, image, pipeline, actor, req });
    }

    // Second, independent abstention check even when the pipeline "succeeded":
    // low confidence, borderline threshold or evidence disagreement.
    const decision = this.safety.evaluateAbstention({
      confidence: pipeline.grading.confidence,
      referableProbability: pipeline.grading.referableProbability,
      gradcamRegions: pipeline.gradcam.regions,
      lesions: pipeline.lesionEvidence.lesions,
      qualityGrade: image.quality_grade,
    });
    if (decision.abstain) {
      return this.#persistAbstention({ analysis, image, pipeline, reason: decision.reason, actor, req });
    }

    return this.#persistCompletion({ analysis, image, pipeline, actor, req });
  }

  async #persistCompletion({ analysis, image, pipeline, actor, req }) {
    const { grading, anatomy, lesionEvidence, gradcam, stageTimingsMs, warnings } = pipeline;
    const triagePriority = this.safety.triagePriority({
      drGradeCode: grading.drGradeCode, abstained: false, qualityGrade: image.quality_grade, referable: grading.referable,
    });
    const auditSampled = this.safety.shouldAuditSample(grading.referable);

    const updated = await this.repo.update(analysis.id, {
      status: 'completed',
      dr_grade_code: grading.drGradeCode,
      dr_grade_label: grading.drGrade,
      grade_probabilities: grading.gradeProbabilities,
      confidence: grading.confidence,
      referable_probability: grading.referableProbability,
      referable: grading.referable,
      triage_priority: triagePriority,
      anatomy,
      lesions: lesionEvidence.lesions,
      stage_timings_ms: stageTimingsMs,
      warnings,
      audit_sampled: auditSampled,
      completed_at: new Date().toISOString(),
      sync_state: 'pending',
    });

    await this.explain.replaceForAnalysis(analysis.id, [
      { layer: 'gradcam', artifact_path: gradcam.heatmapPath, artifact_type: 'png',
        payload: { regions: gradcam.regions, targetLayer: gradcam.targetLayer, peakIntensity: gradcam.peakIntensity } },
      { layer: 'lesion', artifact_type: 'json',
        payload: { lesions: lesionEvidence.lesions, counts: lesionEvidence.counts, totalLesions: lesionEvidence.totalLesions } },
      { layer: 'anatomy', artifact_type: 'json', payload: anatomy },
    ]);

    await this.images.update(image.id, { status: 'analysed' });
    await this.consultations.update(image.consultation_id, {
      status: 'awaiting_review', triage_priority: triagePriority,
    });

    await this.sync.enqueue({ entityType: 'analysis_result', entityId: analysis.id, operation: 'update', payload: updated });
    await this.audit.record({
      action: AuditService.ACTIONS.ANALYSIS_COMPLETED, entityType: 'analysis_result', entityId: analysis.id,
      caseId: image.consultation_id, actor, req,
      after: { drGrade: grading.drGrade, referable: grading.referable, triagePriority, auditSampled },
    });
    this.eventBus?.emit?.('case_updated', { consultationId: image.consultation_id, status: 'awaiting_review', triagePriority });

    return { analysis: updated, envelope: this.safety.resultEnvelope({ abstained: false, qualityGrade: image.quality_grade }) };
  }

  async #persistAbstention({ analysis, image, pipeline, reason, actor, req }) {
    const abstainReason = reason || pipeline.abstainReason || 'STAGE_FAILURE';
    const triagePriority = this.safety.triagePriority({ abstained: true, qualityGrade: image.quality_grade });

    const updated = await this.repo.update(analysis.id, {
      status: 'abstained',
      abstained: true,
      abstain_reason: abstainReason,
      triage_priority: triagePriority,
      stage_timings_ms: pipeline.stageTimingsMs,
      warnings: pipeline.warnings,
      error_message: pipeline.error || null,
      completed_at: new Date().toISOString(),
      sync_state: 'pending',
    });

    await this.consultations.update(image.consultation_id, { status: 'awaiting_review', triage_priority: triagePriority });
    await this.sync.enqueue({ entityType: 'analysis_result', entityId: analysis.id, operation: 'update', payload: updated });
    await this.audit.record({
      action: AuditService.ACTIONS.ANALYSIS_ABSTAINED, entityType: 'analysis_result', entityId: analysis.id,
      caseId: image.consultation_id, actor, req, after: { abstainReason, triagePriority },
    });
    this.eventBus?.emit?.('case_updated', { consultationId: image.consultation_id, status: 'awaiting_review', triagePriority });

    return { analysis: updated, envelope: this.safety.resultEnvelope({ abstained: true, qualityGrade: image.quality_grade }) };
  }

  async get(id) {
    const analysis = await this.repo.findById(id);
    if (!analysis) throw new NotFoundError('Analysis');
    return analysis;
  }

  async getExplainability(id) {
    await this.get(id);
    const layers = await this.explain.listByAnalysis(id);
    return {
      gradcam: layers.find((l) => l.layer === 'gradcam') || null,
      lesion: layers.find((l) => l.layer === 'lesion') || null,
      anatomy: layers.find((l) => l.layer === 'anatomy') || null,
    };
  }

  listByConsultation(consultationId) { return this.repo.listByConsultation(consultationId); }

  gradeMeta(code) { return gradeByCode(code); }
}

module.exports = AnalysisService;
