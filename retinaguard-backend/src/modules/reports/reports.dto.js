'use strict';
const config = require('../../config');
const { decode } = require('../../utils/json');
const { SCREENING_DISCLAIMER } = require('../../config/constants');

const toReportDTO = (r) => ({
  id: r.id,
  consultationId: r.consultation_id,
  analysisId: r.analysis_id,
  reviewId: r.review_id,
  reportNumber: r.report_number,
  verificationCode: r.verification_code,
  verificationUrl: `${config.sync.districtUrl}/reports/verify/${r.verification_code}`,
  schemaVersion: r.schema_version,
  pdfUrl: `${config.apiPrefix}/reports/${r.id}/pdf`,
  jsonUrl: `${config.apiPrefix}/reports/${r.id}/json`,
  pdfAvailable: Boolean(r.pdf_path),
  pdfSha256: r.pdf_sha256 || null,
  generatedAt: r.generated_at,
  disclaimer: SCREENING_DISCLAIMER,
});

/** The machine-readable report body — this is the schema-versioned artefact. */
const toReportJsonDTO = (r) => ({
  ...toReportDTO(r),
  payload: typeof r.payload === 'string' ? decode(r.payload, {}) : r.payload,
});

module.exports = { toReportDTO, toReportJsonDTO };
