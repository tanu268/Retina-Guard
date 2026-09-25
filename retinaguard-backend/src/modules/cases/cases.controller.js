'use strict';
const fs = require('fs');
const asyncHandler = require('../../utils/asyncHandler');
const { ValidationError, NotFoundError, AppError } = require('../../utils/errors');
const logger = require('../../utils/logger');
const { config } = require('../../config');

const parseJSONSafe = (str, context = 'unknown') => {
  if (!str) return null;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    logger.warn({ err: e, context }, 'malformed.json.payload');
    return null;
  }
};

function buildCasesController({
  consultationService,
  imageService,
  analysisService,
  reviewerService,
  reportService,
  matlabService
}) {
  const createCase = asyncHandler(async (req, res) => {
    if (!req.file) throw new ValidationError('An image file is required (field name: image)');
    const { patient_id, consultation_id, laterality, site_id, device_id } = req.body;

    let consultationId = consultation_id;
    try {
      // 1. Create or get case
      if (!consultationId && patient_id) {
        const consultation = await consultationService.create({
          patientId: patient_id,
          siteId: site_id || 'DEFAULT_SITE',
          deviceId: device_id || 'DEFAULT_DEVICE'
        }, req.user, req);
        consultationId = consultation.id;
        logger.info({ case_uuid: consultationId }, 'case.created');
      }
      
      if (!consultationId) {
        throw new ValidationError('Either patient_id or consultation_id is required');
      }

      // 2. Upload image and assess quality
      const imageResult = await imageService.upload({ 
        consultationId, 
        laterality: laterality || 'left', 
        file: req.file 
      }, req.user, req);
      
      const { image, quality } = await imageService.assessQuality(imageResult.id, req.user, req);

      logger.info({ case_uuid: consultationId, image_id: image.id }, 'image.uploaded');

      // If quality passes, triggering AI Analysis would normally happen later or automatically. 
      // Based on frontend flow, it might be separated, but the prompt says POST /cases returns status: PROCESSING.
      // We will let the frontend explicitly request analysis if it wants, or it can be auto-triggered.
      // For now, we return what's required by the contract.

      res.status(201).json({
        case_uuid: consultationId,
        status: 'PROCESSING',
        image_uuid: image.id,
        quality
      });
    } catch (error) {
      if (!consultationId) {
        logger.error({ err: error }, 'case.creation.failed');
      } else {
        logger.error({ err: error, case_uuid: consultationId }, 'image.upload.failed');
      }
      throw error; // Let the central error handler deal with it
    } finally {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
  });

  const getCase = asyncHandler(async (req, res) => {
    const case_uuid = req.params.case_uuid;
    const consultation = await consultationService.get(case_uuid);
    if (!consultation) throw new NotFoundError('Case not found');

    const images = await imageService.listByConsultation(case_uuid);
    let analyses = [];
    let review = null;
    try {
      const reviewCase = await reviewerService.getCase(case_uuid);
      analyses = reviewCase.analyses || [];
      review = reviewCase.review || null;
    } catch (err) {
      if (err.name !== 'NotFoundError') throw err;
    }

    const reviews = review ? [review] : [];
    let reports = [];
    try {
      const report = await reportService.getJson(case_uuid);
      if (report) reports.push(report);
    } catch (err) {
      if (err.name !== 'NotFoundError' && err.name !== 'ClinicalSafetyError') throw err;
    }

    // Aggregate into the exact contract expected by the prompt & frontend
    res.status(200).json({
      case_uuid: consultation.id,
      status: consultation.status,
      site_id: consultation.site_id,
      device_id: consultation.device_id,
      created_at: consultation.created_at,
      case_number: consultation.case_number,
      patient_id: consultation.patient_id,
      patient_name: consultation.patient_name || 'Patient',
      patient_code: consultation.patient_code,
      age: consultation.age,
      gender: consultation.gender,
      village: consultation.village,
      district: consultation.district,
      state: consultation.state,
      triage_priority: consultation.triage_priority,
      images,
      prediction: analyses[0] ? {
        grade: analyses[0].dr_grade_code,
        label: analyses[0].dr_grade_label,
        confidence: analyses[0].confidence,
        referable: analyses[0].referable === 1,
        abstained: Boolean(analyses[0].abstained),
        abstain_reason: analyses[0].abstain_reason
      } : null,
      probabilities: parseJSONSafe(analyses[0]?.grade_probabilities, 'grade_probabilities'),
      anatomy: parseJSONSafe(analyses[0]?.anatomy, 'anatomy'),
      lesions: parseJSONSafe(analyses[0]?.lesions, 'lesions'),
      stage_timings_ms: parseJSONSafe(analyses[0]?.stage_timings_ms, 'stage_timings_ms'),
      explanation: {
        available: !!analyses[0],
        gradcam_path: `/api/v1/cases/explainability/${analyses[0]?.id}`
      },
      report: reports[0] || null,
      review: reviews[0] || null
    });
  });

  const submitReview = asyncHandler(async (req, res) => {
    const { case_uuid } = req.params;
    // Map from expected contract
    const { decision, comment } = req.body;
    
    // Convert Master Prompt contract to existing `reviewerService` contract
    // Typically `submit` expects { consultationId, aiGradeCode, reviewerGradeCode, agreement, decision, referralUrgency, overrideReason, notes }
    const consultation = await consultationService.get(case_uuid);
    if (!consultation) throw new NotFoundError('Case not found');

    // Existing review check is handled internally by reviewerService.decide

    try {
      const review = await reviewerService.decide(case_uuid, {
        reviewerGradeCode: req.body.reviewerGradeCode || 0, // Fallback if frontend doesn't supply it
        decision: decision === 'CONFIRM' ? 'routine_recall' : 'refer', // Mapped
        notes: comment,
        agreement: decision === 'CONFIRM' ? 1 : 0
      }, req.user, req);

      logger.info({ case_uuid, review_id: review.id, decision }, 'review.submitted');

      res.status(200).json({
        decision_uuid: review.id,
        decision,
        comment,
        reviewer_id: req.user.id
      });
    } catch (error) {
      if (error.code === 'CONFLICT' || error.message.includes('already been reviewed')) {
        logger.warn({ err: error, case_uuid }, 'review.duplicate');
      } else {
        logger.error({ err: error, case_uuid }, 'review.failed');
      }
      throw error;
    }
  });

  const getQueue = asyncHandler(async (req, res) => {
    // Map to existing list action
    const query = req.query;
    query.status = 'awaiting_review';
    
    // We must use reviewerService.queue to get the ReviewQueueItem DTO 
    // expected by the frontend, rather than raw DB rows from consultationService.list
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const { items, total } = await reviewerService.queue({ 
      priority: query.priority, 
      status: query.status, 
      limit, 
      offset: (page - 1) * limit 
    });
    
    res.status(200).json({ items, total, page, limit });
  });

  const getReport = asyncHandler(async (req, res) => {
    const { case_uuid } = req.params;
    const report = await reportService.generateReport(case_uuid, req.user, req);
    res.status(200).json(report);
  });

  const getModel = asyncHandler(async (req, res) => {
    const status = await matlabService.healthCheck();
    res.status(200).json({
      model_version: config.matlab.modelVersion,
      model_hash: config.matlab.modelHash,
      preprocessing_version: config.matlab.preprocessingHash,
      deployment_status: status.available ? 'ACTIVE' : 'DEGRADED',
      adapter: config.matlab.adapter
    });
  });

  return { createCase, getCase, submitReview, getQueue, getReport, getModel };
}

module.exports = buildCasesController;
