/**
 * API service layer.
 *
 * Every function here was verified against live HTTP responses from the running
 * backend. Where the previous implementation guessed at an envelope, the guess
 * is corrected and the correction is commented — those guesses were the cause
 * of the empty review queue, the blank report page, and two hard 422s.
 *
 * Rule: services unwrap envelopes so pages receive the payload they actually
 * need. Pages never reach into `.items`, `.report`, `.users` themselves.
 */
import { http, qs } from '../lib/http';
import { MANDATORY_DISCLAIMER } from '../lib/clinical';
import type {
  AdminDashboard, AnalysisResponse, AnalysisResult, AuditEntry, AuditTrailResponse,
  AuditVerifyResponse, AuthUser, Consultation, ConsultationStatus, CreateConsultationRequest,
  CreatePatientRequest, CreateUserRequest, UpdateUserRequest, ExplainabilityLayers, ImageRecord, Laterality, Paginated, Patient,
  PatientResponse, ReportJsonResponse, ReportRecord, ReportVerification, Review,
  ReviewCaseResponse, ReviewDecisionRequest, ReviewQueueItem, ScreeningReport, SyncConflict,
  SyncPushResult, SyncStatus, TriagePriority, UpdateConsultationRequest,
} from '../types';

// ── Cases (Unified API) ───────────────────────────────────────────────────
export const casesService = {
  createCase(patientId: string, consultationId: string | null, laterality: Laterality, file: File) {
    const fd = new FormData();
    fd.append('image', file);
    if (patientId) fd.append('patient_id', patientId);
    if (consultationId) fd.append('consultation_id', consultationId);
    fd.append('laterality', laterality);
    return http.upload<{ case_uuid: string; status: string; quality: any }>('/api/v1/cases', fd);
  },

  getCase(caseUuid: string) {
    return http.get<any>(`/api/v1/case/${caseUuid}`);
  },

  submitReview(caseUuid: string, data: { decision: string; comment: string; reviewerGradeCode?: number }) {
    return http.post<any>(`/api/v1/case/${caseUuid}/review`, data);
  },

  queue() {
    return http.get<any>('/api/v1/queue');
  },

  getReport(caseUuid: string) {
    return http.get<any>(`/api/v1/report/${caseUuid}`);
  },

  getModel() {
    return http.get<any>('/api/v1/model');
  }
};

// ── Patients ──────────────────────────────────────────────────────────────

export const patientService = {
  /** Returns the patient AND any near-duplicates the backend found before
   *  insert. The duplicates are a clinical safeguard, not decoration: the
   *  technician must be able to catch a re-registration. */
  create(data: CreatePatientRequest, idempotencyKey?: string): Promise<PatientResponse> {
    return http.post<PatientResponse>('/patients', data, { idempotencyKey });
  },

  async list(params?: { page?: number; limit?: number; q?: string; district?: string }): Promise<Paginated<Patient>> {
    return http.get<Paginated<Patient>>(`/patients${qs({
      page: params?.page, limit: params?.limit, q: params?.q, district: params?.district,
    })}`);
  },

  /** Backend returns `{ patient }`. */
  async get(id: string): Promise<Patient> {
    const res = await http.get<{ patient: Patient }>(`/patients/${id}`);
    return res.patient;
  },

  async update(id: string, data: Partial<CreatePatientRequest>): Promise<Patient> {
    const res = await http.put<{ patient: Patient }>(`/patients/${id}`, data);
    return res.patient;
  },
};

// ── Consultations ─────────────────────────────────────────────────────────

export const consultationService = {
  /** The schema requires `patientId` (camelCase). The previous client sent
   *  `patient_id` and every call returned 422, which broke the entire
   *  technician workflow at step two. */
  async create(data: CreateConsultationRequest, idempotencyKey?: string): Promise<Consultation> {
    const res = await http.post<{ consultation: Consultation }>('/consultations', data, { idempotencyKey });
    return res.consultation;
  },

  list(params?: { page?: number; limit?: number; status?: ConsultationStatus | string }): Promise<Paginated<Consultation>> {
    return http.get<Paginated<Consultation>>(`/consultations${qs({
      page: params?.page, limit: params?.limit, status: params?.status,
    })}`);
  },

  async get(id: string): Promise<Consultation> {
    const res = await http.get<{ consultation: Consultation }>(`/consultations/${id}`);
    return res.consultation;
  },

  /** PATCH takes camelCase keys, unlike the snake_case row it returns. */
  async update(id: string, data: UpdateConsultationRequest): Promise<Consultation> {
    const res = await http.patch<{ consultation: Consultation }>(`/consultations/${id}`, data);
    return res.consultation;
  },
};

// ── Images ────────────────────────────────────────────────────────────────

export const imageService = {
  /** Runs the MATLAB quality gate synchronously and returns retake guidance
   *  in the same response, so the technician can act before the patient
   *  leaves the chair. */
  upload(consultationId: string, laterality: Laterality, file: File) {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('consultationId', consultationId);
    fd.append('laterality', laterality);
    return http.upload<import('../types').UploadImageResponse>('/images/upload', fd);
  },

  /** Backend returns `{ images }`, not a bare array. */
  async listByConsultation(consultationId: string): Promise<ImageRecord[]> {
    const res = await http.get<{ images: ImageRecord[] }>(`/images/by-consultation/${consultationId}`);
    return res.images ?? [];
  },

  /** Backend returns `{ image }`. */
  async get(id: string): Promise<ImageRecord> {
    const res = await http.get<{ image: ImageRecord }>(`/images/${id}`);
    return res.image;
  },

  remove(id: string) {
    return http.delete<{ deleted: boolean }>(`/images/${id}`);
  },
};

// ── Analysis ──────────────────────────────────────────────────────────────

export const analysisService = {
  /** POST /analysis/run carries the full safety envelope. */
  run(imageId: string, consultationId: string, idempotencyKey?: string): Promise<AnalysisResponse> {
    return http.post<AnalysisResponse>('/analysis/run', { imageId, consultationId }, { idempotencyKey });
  },

  /**
   * GET /analysis/:id returns `{ analysis }` only — the disclaimer and the
   * humanReviewRequired flag are NOT included on this path.
   *
   * A screening result rendered without its disclaimer is a clinical safety
   * defect, so the envelope is reconstructed here from the canonical text
   * rather than left to whichever page happens to display the result.
   */
  async get(id: string): Promise<AnalysisResponse> {
    const res = await http.get<{ analysis: AnalysisResult }>(`/analysis/${id}`);
    return {
      analysis: res.analysis,
      disclaimer: MANDATORY_DISCLAIMER,
      isDiagnosis: false,
      humanReviewRequired: true,
      note: null,
    };
  },

  /** Backend returns `{ explainability }`. */
  async getExplainability(id: string): Promise<ExplainabilityLayers> {
    const res = await http.get<{ explainability: ExplainabilityLayers }>(`/analysis/${id}/explainability`);
    return res.explainability;
  },
};

// ── Reviewer ──────────────────────────────────────────────────────────────

export const reviewService = {
  /** Returns `{ items, pagination }`. The previous client looked for a `queue`
   *  key that does not exist, so the queue always rendered as empty. */
  queue(params?: { priority?: TriagePriority; status?: string; page?: number; limit?: number }): Promise<Paginated<ReviewQueueItem>> {
    return http.get<Paginated<ReviewQueueItem>>(`/api/v1/queue${qs({
      priority: params?.priority, status: params?.status,
      page: params?.page, limit: params?.limit,
    })}`);
  },

  /** `{ consultation, analyses, review }` — mapped from unified /api/v1/case endpoint.
   *
   * The unified endpoint does not return a full ConsultationWithPatient row, so
   * we construct the minimum shape ReviewWorkspace needs. Fields absent from the
   * unified response default to null rather than sentinel strings like 'UNKNOWN'. */
  async getCase(consultationId: string): Promise<ReviewCaseResponse> {
    const res = await http.get<any>(`/api/v1/case/${consultationId}`);
    return {
      consultation: {
        id: res.case_uuid ?? consultationId,
        case_number: res.case_number ?? consultationId,
        status: res.status,
        site_id: res.site_id ?? null,
        device_id: res.device_id ?? null,
        created_at: res.created_at ?? new Date().toISOString(),
        // Patient fields are not present on the unified endpoint; ReviewWorkspace
        // loads them separately via imageService.listByConsultation.
        patient_name: res.patient_name ?? null,
        patient_id: res.patient_id ?? '',
        age: res.age ?? null,
        gender: res.gender ?? null,
        village: res.village ?? null,
        district: res.district ?? null,
        state: res.state ?? null,
        diabetes_type: res.diabetes_type ?? null,
        diabetes_duration_years: res.diabetes_duration_years ?? null,
        patient_code: res.patient_code ?? null,
        triage_priority: res.triage_priority ?? null,
        // Required Consultation fields
        technician_id: null, reviewer_id: null,
        notes: null, identity_confirmed: 0, recapture_attempts: 0,
        final_grade_code: null, final_referable: null,
        consultation_date: res.created_at ?? null, closed_at: null,
        version: 1, sync_state: 'pending' as const,
        updated_at: res.created_at ?? new Date().toISOString(), deleted_at: null,
      } as any,

      analyses: res.prediction ? [{
        id: res.analysis_id ?? res.case_uuid,
        image_id: res.image_id ?? null,
        consultation_id: consultationId,
        status: res.prediction.abstained ? 'abstained' : 'completed',
        model_version: res.model_version ?? 'unknown',
        model_hash: res.model_hash ?? '',
        preprocessing_hash: res.preprocessing_hash ?? '',
        dr_grade_code: res.prediction.abstained ? null : res.prediction.grade,
        dr_grade_label: res.prediction.abstained ? null : res.prediction.label,
        confidence: res.prediction.abstained ? null : res.prediction.confidence,
        referable_probability: res.prediction.abstained ? null : (res.prediction.referable_probability ?? null),
        referable: res.prediction.abstained ? null : (res.prediction.referable ? 1 : 0),
        grade_probabilities: res.probabilities ?? null,
        abstained: res.prediction.abstained ? 1 : 0,
        abstain_reason: res.prediction.abstain_reason ?? null,
        triage_priority: res.triage_priority ?? null,
        anatomy: res.anatomy ?? null,
        lesions: res.lesions ?? null,
        stage_timings_ms: res.stage_timings_ms ?? null,
        warnings: res.warnings ?? null,
        error_message: null,
        audit_sampled: 0,
        started_at: null,
        completed_at: res.created_at ?? null,
        sync_state: 'pending' as const,
        created_at: res.created_at ?? new Date().toISOString(),
        updated_at: res.created_at ?? new Date().toISOString(),
      }] as any : [],
      review: res.review ?? null,
    };
  },

  /** `reviewerGradeCode` is mandatory. */
  async decide(consultationId: string, data: ReviewDecisionRequest): Promise<Review> {
    const res = await http.post<any>(`/api/v1/case/${consultationId}/review`, {
      decision: data.decision,
      comment: data.notes,
      reviewerGradeCode: data.reviewerGradeCode
    });
    return {
      id: res.decision_uuid,
      decision: res.decision,
      notes: res.comment
    } as any;
  },
};

// ── Reports ───────────────────────────────────────────────────────────────

export const reportService = {
  async generate(consultationId: string): Promise<ReportRecord> {
    const res = await http.post<{ report: ReportRecord }>(`/reports/${consultationId}/generate`);
    return res.report;
  },

  /** Returns `{ report, meta }`. Casting the envelope straight to
   *  ScreeningReport left every field undefined and rendered a blank page. */
  async getJson(consultationId: string): Promise<ScreeningReport> {
    const res = await http.get<ReportJsonResponse>(`/reports/${consultationId}/json`);
    return res.report;
  },

  async getMeta(consultationId: string) {
    const res = await http.get<ReportJsonResponse>(`/reports/${consultationId}/json`);
    return res.meta;
  },

  pdfBlob(consultationId: string): Promise<Blob> {
    return http.get<Blob>(`/reports/${consultationId}/pdf`, { accept: 'application/pdf' });
  },

  /** Public, unauthenticated, returns no PHI — this is what a QR scan hits. */
  verify(token: string): Promise<ReportVerification> {
    return http.publicGet<ReportVerification>(`/reports/verify/${token}`);
  },
};

// ── Sync ──────────────────────────────────────────────────────────────────

export const syncService = {
  status(): Promise<SyncStatus> {
    return http.get<SyncStatus>('/sync/status');
  },

  /** Backend returns `{ conflicts }`. */
  async conflicts(): Promise<SyncConflict[]> {
    const res = await http.get<{ conflicts: SyncConflict[] }>('/sync/conflicts');
    return res.conflicts ?? [];
  },

  push(batchSize?: number): Promise<SyncPushResult> {
    return http.post<SyncPushResult>('/sync/push', batchSize ? { batchSize } : undefined);
  },

  pull(since?: string, limit?: number): Promise<SyncPushResult> {
    return http.post<SyncPushResult>('/sync/pull', { since, limit });
  },
};

// ── Audit ─────────────────────────────────────────────────────────────────

export const auditService = {
  async trail(caseId: string): Promise<AuditEntry[]> {
    const res = await http.get<AuditTrailResponse>(`/audit/${caseId}`);
    return res.entries ?? [];
  },

  /** Walks the hash chain and reports the first broken link, if any. */
  verify(caseId?: string): Promise<AuditVerifyResponse> {
    return http.get<AuditVerifyResponse>(`/audit/verify${qs({ caseId })}`);
  },
};

// ── Admin ─────────────────────────────────────────────────────────────────

export const adminService = {
  dashboard(): Promise<AdminDashboard> {
    return http.get<AdminDashboard>('/admin/dashboard');
  },

  /** Backend returns `{ users }`. */
  async users(params?: { role?: string; page?: number; limit?: number }): Promise<AuthUser[]> {
    const res = await http.get<{ users: AuthUser[] }>(`/admin/users${qs({
      role: params?.role, page: params?.page, limit: params?.limit,
    })}`);
    return res.users ?? [];
  },

  async create(body: CreateUserRequest): Promise<AuthUser> {
    const res = await http.post<{ user: AuthUser }>('/admin/users', body);
    return res.user;
  },

  async update(id: string, body: UpdateUserRequest): Promise<AuthUser> {
    const res = await http.patch<{ user: AuthUser }>(`/admin/users/${id}`, body);
    return res.user;
  },

  async deactivate(id: string): Promise<AuthUser> {
    const res = await http.post<{ user: AuthUser }>(`/admin/users/${id}/deactivate`);
    return res.user;
  },

  async activate(id: string): Promise<AuthUser> {
    const res = await http.post<{ user: AuthUser }>(`/admin/users/${id}/activate`);
    return res.user;
  },

  /** Permanent. The UI gates this behind a typed-confirmation dialog. */
  async remove(id: string): Promise<{ id: string; deleted: boolean }> {
    return http.delete<{ id: string; deleted: boolean }>(`/admin/users/${id}`);
  },

  async capabilities(): Promise<Record<string, unknown>> {
    const res = await http.get<{ capabilities: Record<string, unknown> }>('/admin/capabilities');
    return res.capabilities;
  },
};

// ── Geo (state / district reference data) ─────────────────────────────────

export const geoService = {
  async states(): Promise<string[]> {
    const res = await http.publicGet<{ states: string[] }>('/geo/states');
    return res.states ?? [];
  },

  async districts(state: string): Promise<string[]> {
    const res = await http.publicGet<{ state: string; districts: string[] }>(
      `/geo/districts${qs({ state })}`,
    );
    return res.districts ?? [];
  },
};

// ── Health ────────────────────────────────────────────────────────────────

export const healthService = {
  liveness() {
    return http.publicGet<{ status: string; service: string; time: string }>('/health');
  },
  matlab() {
    return http.publicGet<{ adapter: string; available: boolean; matlabRuntime: boolean; note?: string }>('/health/matlab');
  },
};
