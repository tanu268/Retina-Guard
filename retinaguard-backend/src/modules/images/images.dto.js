'use strict';
const config = require('../../config');
const { decode } = require('../../utils/json');

const toImageDTO = (i) => ({
  id: i.id,
  consultationId: i.consultation_id,
  laterality: i.laterality,
  captureAttempt: Number(i.capture_attempt),
  fileName: i.file_name,
  fileUrl: `${config.apiPrefix}/images/${i.id}/file`,
  mimeType: i.mime_type,
  sizeBytes: Number(i.size_bytes),
  sha256: i.sha256,
  quality: {
    grade: i.quality_grade || null,
    score: i.quality_score === null || i.quality_score === undefined ? null : Number(i.quality_score),
    gradable: i.quality_grade ? i.quality_grade !== 'C' : null,
    reasons: decode(i.quality_reasons, []),
    metrics: decode(i.quality_metrics, null),
  },
  status: i.status,
  deviceId: i.device_id || null,
  capturedAt: i.captured_at || null,
  uploadedBy: i.uploaded_by,
  version: Number(i.version),
  createdAt: i.created_at,
  updatedAt: i.updated_at,
});

/** Response shape the technician app renders directly after an upload. */
const toUploadResultDTO = ({ image, gate }) => ({
  image: toImageDTO(image),
  gate: {
    accepted: gate.accepted,
    grade: gate.grade,
    recaptureRequired: gate.recaptureRequired,
    attemptsUsed: gate.attemptsUsed,
    attemptsRemaining: gate.attemptsRemaining,
    escalated: gate.escalated,
    guidance: gate.guidance,
    message: gate.message,
  },
});

module.exports = { toImageDTO, toUploadResultDTO };
