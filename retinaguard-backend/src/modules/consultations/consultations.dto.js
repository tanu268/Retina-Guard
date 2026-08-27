'use strict';
const { decode } = require('../../utils/json');
const { SCREENING_DISCLAIMER } = require('../../config/constants');

const toConsultationDTO = (c) => ({
  id: c.id,
  caseNumber: c.case_number,
  patientId: c.patient_id,
  patientName: c.patient_name || undefined,
  patientCode: c.patient_code || undefined,
  technicianId: c.technician_id,
  technicianName: c.technician_name || undefined,
  facilityId: c.facility_id,
  districtCode: c.district_code,
  status: c.status,
  priority: c.priority || null,
  identityConfirmed: Number(c.identity_confirmed) === 1,
  captureAttempts: Number(c.capture_attempts),
  chiefComplaint: c.chief_complaint || null,
  notes: c.notes || null,
  deviceId: c.device_id || null,
  closedAt: c.closed_at || null,
  version: Number(c.version),
  createdAt: c.created_at,
  updatedAt: c.updated_at,
});

const toImageSummaryDTO = (i) => ({
  id: i.id,
  laterality: i.laterality,
  captureAttempt: Number(i.capture_attempt),
  qualityGrade: i.quality_grade || null,
  qualityScore: i.quality_score === null || i.quality_score === undefined ? null : Number(i.quality_score),
  qualityReasons: decode(i.quality_reasons, []),
  status: i.status,
  sizeBytes: Number(i.size_bytes),
  sha256: i.sha256,
  createdAt: i.created_at,
});

const toAnalysisSummaryDTO = (a) => ({
  id: a.id,
  imageId: a.image_id,
  status: a.status,
  drGrade: a.dr_grade,
  drGradeCode: a.dr_grade_code === null || a.dr_grade_code === undefined ? null : Number(a.dr_grade_code),
  confidence: a.confidence === null || a.confidence === undefined ? null : Number(a.confidence),
  referable: a.referable === null || a.referable === undefined ? null : Number(a.referable) === 1,
  abstained: Number(a.abstained) === 1,
  priority: a.priority,
  modelVersion: a.model_version,
  createdAt: a.created_at,
});

const toReviewSummaryDTO = (r) => ({
  id: r.id,
  reviewerId: r.reviewer_id,
  reviewerName: r.reviewer_name || undefined,
  decision: r.decision,
  finalGrade: r.final_grade || null,
  finalGradeCode: r.final_grade_code === null || r.final_grade_code === undefined ? null : Number(r.final_grade_code),
  referralOutcome: r.referral_outcome || null,
  agreedWithAi: r.agreed_with_ai === null || r.agreed_with_ai === undefined ? null : Number(r.agreed_with_ai) === 1,
  notes: r.notes || null,
  reviewDurationMs: r.review_duration_ms === null || r.review_duration_ms === undefined ? null : Number(r.review_duration_ms),
  reviewedAt: r.reviewed_at,
});

const toCasePackageDTO = (pkg) => ({
  consultation: toConsultationDTO(pkg.consultation),
  patient: {
    id: pkg.consultation.patient_id,
    name: pkg.consultation.patient_name,
    code: pkg.consultation.patient_code,
    sex: pkg.consultation.sex,
    ageYears: pkg.consultation.age_years === null || pkg.consultation.age_years === undefined
      ? null : Number(pkg.consultation.age_years),
    village: pkg.consultation.village,
    districtCode: pkg.consultation.patient_district,
    diabetesDurationYears: pkg.consultation.diabetes_duration_years === null
      || pkg.consultation.diabetes_duration_years === undefined
      ? null : Number(pkg.consultation.diabetes_duration_years),
  },
  images: pkg.images.map(toImageSummaryDTO),
  analyses: pkg.analyses.map(toAnalysisSummaryDTO),
  reviews: pkg.reviews.map(toReviewSummaryDTO),
  disclaimer: SCREENING_DISCLAIMER,
});

module.exports = {
  toConsultationDTO, toImageSummaryDTO, toAnalysisSummaryDTO,
  toReviewSummaryDTO, toCasePackageDTO,
};
