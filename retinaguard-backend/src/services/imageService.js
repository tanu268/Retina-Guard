'use strict';
const { uuid } = require('../utils/ids');
const { NotFoundError, ClinicalSafetyError, UnsupportedMediaTypeError } = require('../utils/errors');
const AuditService = require('./auditService');

/**
 * Owns capture-side rules: recapture ceiling, quality gating, supersession of
 * earlier attempts for the same eye. The quality *assessment* itself is a
 * MATLAB pipeline stage (see analysisService), but the workflow rules that
 * wrap it live here.
 */
class ImageService {
  constructor({
    imageRepository, consultationRepository, storageService, matlabService,
    clinicalSafetyService, auditService, syncService, config, eventBus,
  }) {
    this.repo = imageRepository;
    this.consultations = consultationRepository;
    this.storage = storageService;
    this.matlab = matlabService;
    this.safety = clinicalSafetyService;
    this.audit = auditService;
    this.sync = syncService;
    this.config = config;
    this.eventBus = eventBus;
  }

  async upload({ consultationId, laterality, file }, actor, req) {
    const consultation = await this.consultations.findById(consultationId);
    if (!consultation) throw new NotFoundError('Consultation');

    if (!this.config.uploads.allowedMime.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeError(`Unsupported image type: ${file.mimetype}`);
    }

    const attempts = await this.repo.attemptCount(consultationId, laterality);
    if (attempts > this.config.clinical.maxRecaptureAttempts) {
      await this.audit.record({
        action: AuditService.ACTIONS.RECAPTURE_EXHAUSTED, entityType: 'consultation',
        entityId: consultationId, caseId: consultationId, actor, req,
        reason: `laterality=${laterality} attempts=${attempts}`,
      });
      throw new ClinicalSafetyError(
        `Maximum recapture attempts (${this.config.clinical.maxRecaptureAttempts}) reached for the ${laterality} eye. Escalate to human review instead of retaking.`,
        { laterality, attempts, maxAttempts: this.config.clinical.maxRecaptureAttempts },
      );
    }

    const filename = `${consultationId}-${laterality}-${attempts + 1}${require('path').extname(file.originalname || '.jpg')}`;
    const placed = await this.storage.place(file.path, 'fundus', filename);

    const image = await this.repo.create({
      id: uuid(),
      consultation_id: consultationId,
      patient_id: consultation.patient_id,
      laterality,
      file_path: placed.relativePath,
      original_name: file.originalname,
      mime_type: file.mimetype,
      size_bytes: placed.sizeBytes,
      sha256: placed.sha256,
      capture_attempt: attempts + 1,
      status: 'uploaded',
      device_id: consultation.device_id,
      captured_at: new Date().toISOString(),
    });

    await this.consultations.incrementRecapture(consultationId);
    await this.sync.enqueue({ entityType: 'image', entityId: image.id, operation: 'create', payload: image });
    await this.audit.record({
      action: AuditService.ACTIONS.IMAGE_UPLOADED, entityType: 'image', entityId: image.id,
      caseId: consultationId, actor, req, after: { ...image, sha256: image.sha256.slice(0, 16) },
    });

    return image;
  }

  /**
   * Runs the quality gate stage only. Called immediately after upload so the
   * technician gets actionable retake guidance before leaving the patient.
   */
  async assessQuality(imageId, actor, req) {
    const image = await this.get(imageId);
    const result = await this.matlab.qualityAssessment({ imagePath: this.storage.absolute(image.file_path), sha256: image.sha256 });

    const updated = await this.repo.update(imageId, {
      quality_grade: result.qualityGrade,
      quality_score: result.qualityScore,
      quality_reasons: result.reasons,
      quality_checked_at: new Date().toISOString(),
      status: result.qualityGrade === 'C' ? 'quality_fail' : 'quality_pass',
    });

    if (result.qualityGrade === 'C') {
      await this.repo.supersedePrevious(image.consultation_id, image.laterality, imageId);
      const remaining = this.config.clinical.maxRecaptureAttempts - image.capture_attempt;
      await this.consultations.update(image.consultation_id, { status: 'quality_failed' });
      await this.audit.record({
        action: AuditService.ACTIONS.IMAGE_QUALITY_REFUSED, entityType: 'image', entityId: imageId,
        caseId: image.consultation_id, actor, req, after: { qualityGrade: result.qualityGrade, remaining },
      });
      this.eventBus?.emit?.('case_updated', { consultationId: image.consultation_id, status: 'quality_failed' });
      return { image: updated, quality: result, recaptureAllowed: remaining > 0, remainingAttempts: Math.max(0, remaining) };
    }

    await this.audit.record({
      action: AuditService.ACTIONS.IMAGE_QUALITY_ASSESSED, entityType: 'image', entityId: imageId,
      caseId: image.consultation_id, actor, req, after: { qualityGrade: result.qualityGrade },
    });
    return { image: updated, quality: result, recaptureAllowed: true, remainingAttempts: this.config.clinical.maxRecaptureAttempts };
  }

  async get(id) {
    const image = await this.repo.findById(id);
    if (!image) throw new NotFoundError('Image');
    return image;
  }

  listByConsultation(consultationId) { return this.repo.listByConsultation(consultationId); }

  async remove(id, actor, req) {
    const image = await this.get(id);
    if (image.status === 'analysed') {
      throw new ClinicalSafetyError('Cannot delete an image that has already been analysed; it is part of the case record.');
    }
    await this.repo.softDeleteById(id);
    await this.audit.record({
      action: AuditService.ACTIONS.IMAGE_DELETED, entityType: 'image', entityId: id,
      caseId: image.consultation_id, actor, req, before: { status: image.status },
    });
    return { success: true };
  }
}

module.exports = ImageService;
