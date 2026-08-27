'use strict';

const toPatientDTO = (p) => ({
  id: p.id,
  patientCode: p.patient_code,
  name: p.full_name,
  sex: p.sex,
  dateOfBirth: p.date_of_birth || null,
  ageYears: p.age_years === null || p.age_years === undefined ? null : Number(p.age_years),
  phone: p.phone || null,
  village: p.village || null,
  block: p.block || null,
  districtCode: p.district_code || null,
  diabetesDurationYears: p.diabetes_duration_years === null || p.diabetes_duration_years === undefined
    ? null : Number(p.diabetes_duration_years),
  lastScreenedAt: p.last_screened_at || null,
  facilityId: p.facility_id,
  version: Number(p.version),
  createdAt: p.created_at,
  updatedAt: p.updated_at,
});

module.exports = { toPatientDTO };
