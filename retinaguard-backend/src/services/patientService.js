'use strict';
const { uuid } = require('../utils/ids');
const { NotFoundError, ConflictError } = require('../utils/errors');
const AuditService = require('./auditService');

class PatientService {
  constructor({ patientRepository, auditService, syncService, config }) {
    this.repo = patientRepository;
    this.audit = auditService;
    this.sync = syncService;
    this.config = config;
  }

  async register(input, actor, req) {
    const duplicates = await this.repo.findPossibleDuplicates({
      fullName: input.fullName, phone: input.phone, age: input.age,
    });

    const patientCode = input.patientCode
      || await this.repo.nextPatientCode(this.config.node.siteId.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase());

    const patient = await this.repo.create({
      id: uuid(),
      patient_code: patientCode,
      full_name: input.fullName,
      age: input.age ?? null,
      gender: input.gender ?? null,
      phone: input.phone ?? null,
      village: input.village ?? null,
      district: input.district ?? null,
      state: input.state ?? null,
      diabetes_type: input.diabetesType ?? null,
      diabetes_duration_years: input.diabetesDurationYears ?? null,
      hba1c: input.hba1c ?? null,
      facility_id: input.facilityId || actor?.facility_id || this.config.node.siteId,
      created_by: actor?.id ?? null,
    });

    await this.sync.enqueue({ entityType: 'patient', entityId: patient.id, operation: 'create', payload: patient, version: patient.version });
    await this.audit.record({ action: AuditService.ACTIONS.PATIENT_CREATED, entityType: 'patient', entityId: patient.id, actor, req, after: patient });

    return { patient, possibleDuplicates: duplicates.filter((d) => d.id !== patient.id) };
  }

  async get(id) {
    const patient = await this.repo.findById(id);
    if (!patient) throw new NotFoundError('Patient');
    return patient;
  }

  list({ q, district, page = 1, limit = 20 } = {}) {
    return this.repo.search({ q, district, limit, offset: (page - 1) * limit });
  }

  async update(id, patch, actor, req) {
    const existing = await this.get(id);
    const updated = await this.repo.updateWithVersion(id, {
      full_name: patch.fullName ?? existing.full_name,
      age: patch.age ?? existing.age,
      gender: patch.gender ?? existing.gender,
      phone: patch.phone ?? existing.phone,
      village: patch.village ?? existing.village,
      district: patch.district ?? existing.district,
      state: patch.state ?? existing.state,
      diabetes_type: patch.diabetesType ?? existing.diabetes_type,
      diabetes_duration_years: patch.diabetesDurationYears ?? existing.diabetes_duration_years,
      hba1c: patch.hba1c ?? existing.hba1c,
      sync_state: 'pending',
    }, existing.version);

    if (!updated) {
      throw new ConflictError('Patient was modified by another session; reload and retry.', { patientId: id });
    }

    await this.sync.enqueue({ entityType: 'patient', entityId: id, operation: 'update', payload: updated, version: updated.version });
    await this.audit.record({ action: AuditService.ACTIONS.PATIENT_UPDATED, entityType: 'patient', entityId: id, actor, req, before: existing, after: updated });
    return updated;
  }
}

module.exports = PatientService;
