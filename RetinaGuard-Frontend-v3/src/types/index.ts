/**
 * RetinaGuard frontend contract.
 *
 * Corrected against LIVE responses captured from the running backend, not from
 * docs/interfaces.ts alone. Where the two disagreed, the wire format won and the
 * divergence is commented inline.
 *
 * The most important correction: SQLite has no boolean type, so several fields
 * documented as `boolean` arrive as the integers 0 and 1. `abstained === true`
 * is false for an abstained case. Use the `isTrue()` helper in lib/format.ts.
 */

// ── Enums / literal unions ───────────────────────────────────────────────

export type Role = 'technician' | 'reviewer' | 'admin' | 'district';

export type Laterality = 'left' | 'right';

export type QualityGrade = 'A' | 'B' | 'C';

export type ConsultationStatus =
  | 'registered' | 'capture_pending' | 'quality_failed' | 'analysis_pending'
  | 'analysis_complete' | 'awaiting_review' | 'review_complete' | 'closed' | 'cancelled';

export type TriagePriority = 'P0' | 'P1' | 'P2' | 'P3';

export type DrGradeCode = 0 | 1 | 2 | 3 | 4;

export type AbstainReason =
  | 'LOW_CONFIDENCE' | 'UNGRADEABLE_IMAGE' | 'EXPLANATION_DISAGREEMENT'
  | 'STAGE_FAILURE' | 'BORDERLINE_THRESHOLD';

export type ReviewDecision = 'refer' | 'routine_recall' | 'repeat_imaging' | 'escalate';
export type ReferralUrgency = 'immediate' | 'within_1_week' | 'within_1_month' | 'routine';

export type SyncState = 'pending' | 'synced' | 'conflict';

/** SQLite integer boolean. 0 = false, 1 = true. */
export type SqlBool = boolean | 0 | 1;

// ── Auth ─────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: Role;
  facility_id: string | null;
  registration_no?: string | null;
  is_active: SqlBool;
  last_login_at?: string | null;
  /** Present on GET /auth/me, absent from the login payload. */
  failed_logins?: number;
  locked_until?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** GET /auth/me wraps the user. Reading it as a bare AuthUser silently yields
 *  `role: undefined`, which fails every role gate after a page refresh. */
export interface MeResponse {
  user: AuthUser;
}

// ── Patients ─────────────────────────────────────────────────────────────

export interface Patient {
  id: string;
  patient_code: string;
  full_name: string;
  age: number | null;
  gender: 'male' | 'female' | 'other' | 'undisclosed' | null;
  phone: string | null;
  village: string | null;
  district: string | null;
  state: string | null;
  diabetes_type: 'type1' | 'type2' | 'gestational' | 'unknown' | null;
  diabetes_duration_years: number | null;
  hba1c: number | null;
  facility_id: string | null;
  created_by: string;
  version: number;
  sync_state: SyncState;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PatientResponse {
  patient: Patient;
  possibleDuplicates?: Patient[];
}

/** POST /patients — request body is camelCase, unlike the snake_case response. */
export interface CreatePatientRequest {
  fullName: string;
  age?: number;
  gender?: string;
  phone?: string;
  village?: string;
  district?: string;
  state?: string;
  /** Yes / No / Unknown. Gates whether duration and hba1c may be sent at all. */
  diabetesHistory?: 'yes' | 'no' | 'unknown';
  diabetesType?: string;
  diabetesDurationYears?: number;
  hba1c?: number;
}

// ── Consultations (cases) ───────────────────────────────────────────────

export interface Consultation {
  id: string;
  case_number: string;
  patient_id: string;
  technician_id: string | null;
  reviewer_id: string | null;
  status: ConsultationStatus;
  triage_priority: TriagePriority | null;
  notes: string | null;
  site_id: string | null;
  device_id: string | null;
  identity_confirmed: SqlBool;
  recapture_attempts: number;
  final_grade_code: DrGradeCode | null;
  final_referable: SqlBool | null;
  consultation_date: string | null;
  closed_at: string | null;
  version: number;
  sync_state: SyncState;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** GET /review/:id joins patient columns onto the consultation row. */
export interface ConsultationWithPatient extends Consultation {
  patient_code: string;
  patient_name: string;
  age: number | null;
  gender: string | null;
  village: string | null;
  district: string | null;
  state: string | null;
  diabetes_type: string | null;
  diabetes_duration_years: number | null;
}

/** POST /consultations — the API requires `patientId`, NOT `patient_id`.
 *  Sending snake_case returns 422 VALIDATION_ERROR. */
export interface CreateConsultationRequest {
  patientId: string;
  identityConfirmed: boolean;
  deviceId?: string;
  notes?: string;
}

/** PATCH /consultations/:id — camelCase, unlike the Consultation row. */
export interface UpdateConsultationRequest {
  status?: ConsultationStatus;
  reviewerId?: string;
  triagePriority?: TriagePriority;
  notes?: string;
  finalGradeCode?: DrGradeCode;
  finalReferable?: boolean;
}

// ── Images ───────────────────────────────────────────────────────────────

export interface QualityReason { code: string; message: string; }

export interface ImageRecord {
  id: string;
  consultation_id: string;
  patient_id: string;
  laterality: Laterality;
  file_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  sha256: string;
  capture_attempt: number;
  quality_grade: QualityGrade | null;
  quality_score: number | null;
  quality_reasons: QualityReason[] | null;
  quality_checked_at: string | null;
  status: 'uploaded' | 'quality_pass' | 'quality_fail' | 'superseded' | 'analysed' | 'deleted';
  device_id: string | null;
  captured_at: string | null;
  sync_state: SyncState;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface QualityMetrics {
  focusScore: number;
  illuminationUniformity: number;
  contrast: number;
  fieldCoverage: number;
}

export interface QualityAssessment {
  qualityGrade: QualityGrade;
  qualityScore: number;
  gradeable: SqlBool;
  reasons: QualityReason[];
  metrics: QualityMetrics;
  durationMs?: number;
}

export interface UploadImageResponse {
  image: ImageRecord;
  quality: QualityAssessment;
  recaptureAllowed: SqlBool;
  remainingAttempts: number;
}

// ── Analysis ─────────────────────────────────────────────────────────────

export type LesionType =
  | 'microaneurysm' | 'haemorrhage' | 'hard_exudate'
  | 'soft_exudate' | 'neovascularisation' | 'venous_beading';

export interface LesionEvidence {
  type: LesionType;
  bbox: { x: number; y: number; w: number; h: number };
  areaPx: number;
  confidence: number;
  quadrant: string;
}

export interface AnatomyResult {
  opticDisc: {
    detected: SqlBool; centre: { x: number; y: number };
    radius: number; cupToDiscRatio: number; confidence: number;
  };
  fovea: { detected: SqlBool; centre: { x: number; y: number }; confidence: number };
  vessels: {
    segmented: SqlBool; vesselDensity: number;
    arteryVeinRatio: number; tortuosityIndex: number; maskPath?: string | null;
  };
  macularZone?: { withinTwoDiscDiameters: SqlBool };
  durationMs?: number;
}

export interface AnalysisResult {
  id: string;
  image_id: string;
  consultation_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'abstained';
  model_version: string;
  model_hash: string;
  preprocessing_hash: string;
  dr_grade_code: DrGradeCode | null;
  dr_grade_label: string | null;
  grade_probabilities: number[] | null; // length 5, sums to 1
  confidence: number | null;
  referable_probability: number | null;
  referable: SqlBool | null;
  abstained: SqlBool;
  abstain_reason: AbstainReason | null;
  triage_priority: TriagePriority | null;
  anatomy: AnatomyResult | null;
  lesions: LesionEvidence[] | null;
  stage_timings_ms: Record<string, number> | null;
  warnings: string[] | null;
  error_message: string | null;
  audit_sampled: SqlBool;
  started_at: string | null;
  completed_at: string | null;
  sync_state: SyncState;
  created_at: string;
  updated_at: string;
}

/** POST /analysis/run returns the safety envelope alongside the result.
 *  GET /analysis/:id returns `{ analysis }` ONLY — no disclaimer. Rendering a
 *  screening result without its disclaimer is a clinical safety defect, so the
 *  service layer re-attaches the canonical disclaimer on the GET path. */
export interface AnalysisResponse {
  analysis: AnalysisResult;
  disclaimer: string;
  isDiagnosis: false;
  humanReviewRequired: true;
  note: string | null;
}

/** Each layer is the full explainability row, not just its payload. */
export interface ExplainabilityRow<P> {
  id: string;
  analysis_id: string;
  layer: 'gradcam' | 'lesion' | 'anatomy';
  artifact_path: string | null;
  artifact_type: 'png' | 'json' | string;
  payload: P;
  disagreement_flag: SqlBool;
  disagreement_note: string | null;
  created_at: string;
}

export interface GradcamRegion { x: number; y: number; w: number; h: number; intensity: number; }

export interface ExplainabilityLayers {
  gradcam: ExplainabilityRow<{
    regions: GradcamRegion[]; targetLayer: string; peakIntensity: number;
  }> | null;
  lesion: ExplainabilityRow<{
    lesions: LesionEvidence[]; counts: Record<string, number>; totalLesions: number;
  }> | null;
  anatomy: ExplainabilityRow<AnatomyResult> | null;
}

// ── Reviewer ─────────────────────────────────────────────────────────────

/** The queue view returns 22 columns — considerably more than docs/interfaces.ts
 *  described. The extra identifiers make the queue card actionable without a
 *  second round trip. */
export interface ReviewQueueItem {
  consultation_id: string;
  case_number: string;
  status: ConsultationStatus;
  triage_priority: TriagePriority;
  consultation_date: string | null;
  recapture_attempts: number;
  patient_id: string;
  patient_code: string;
  patient_name: string;
  age: number | null;
  gender: string | null;
  analysis_id: string | null;
  dr_grade_code: DrGradeCode | null;
  dr_grade_label: string | null;
  confidence: number | null;
  referable: SqlBool | null;
  abstained: SqlBool;
  abstain_reason: AbstainReason | null;
  audit_sampled: SqlBool;
  analysed_at: string | null;
  image_id: string | null;
  laterality: Laterality | null;
  quality_grade: QualityGrade | null;
}

export interface Review {
  id: string;
  consultation_id: string;
  analysis_id: string | null;
  reviewer_id: string;
  ai_grade_code: DrGradeCode | null;
  reviewer_grade_code: DrGradeCode;
  agreement: SqlBool | null;
  decision: ReviewDecision;
  referral_urgency: ReferralUrgency | null;
  override_reason: string | null;
  notes: string | null;
  review_started_at: string | null;
  review_completed_at: string | null;
  duration_seconds: number | null;
  sync_state: SyncState;
  created_at: string;
  updated_at: string;
}

/** GET /review/:id */
export interface ReviewCaseResponse {
  consultation: ConsultationWithPatient;
  analyses: AnalysisResult[];
  review: Review | null;
}

/** POST /review/:id/decision.
 *  `reviewerGradeCode` is REQUIRED — omitting it returns 422. */
export interface ReviewDecisionRequest {
  reviewerGradeCode: DrGradeCode;
  decision: ReviewDecision;
  referralUrgency?: ReferralUrgency;
  overrideReason?: string;
  notes?: string;
  reviewStartedAt?: string;
}

// ── Reports ──────────────────────────────────────────────────────────────

export interface ScreeningReport {
  reportNumber: string;
  caseNumber: string;
  status: 'provisional' | 'final' | 'superseded';
  siteId: string;
  generatedAt: string;
  schemaVersion: string;
  patient: {
    name: string; patientCode: string; age: number | null; gender: string | null;
    village: string | null; district: string | null; diabetesDurationYears: number | null;
  } | null;
  images: { laterality: Laterality; fundusPath: string; gradcamPath: string | null } | null;
  result: {
    abstained: SqlBool;
    abstainReason: AbstainReason | null;
    abstainMessage: string | null;
    gradeCode: DrGradeCode | null;
    gradeLabel: string | null;
    confidence: number | null;
    referableProbability: number | null;
    referable: SqlBool;
    triagePriority: TriagePriority | null;
    qualityGrade: QualityGrade | null;
    modelVersion: string;
    modelHash: string;
    warnings: string[];
  } | null;
  explainability: {
    gradcam: { regionCount: number; peakIntensity?: number } | null;
    lesion: { counts: Record<string, number> } | null;
    anatomy: { opticDiscDetected: SqlBool; foveaDetected: SqlBool; cupToDiscRatio?: number } | null;
    disagreement: SqlBool;
  };
  review: {
    reviewerName: string | null;
    registrationNo: string | null;
    gradeCode: DrGradeCode;
    gradeLabel?: string;
    agreement: SqlBool | null;
    decision: ReviewDecision;
    referralUrgency: ReferralUrgency | null;
    overrideReason: string | null;
    notes: string | null;
    completedAt: string;
  } | null;
  qrToken: string;
}

/** GET /reports/:id/json returns the report wrapped alongside meta. */
export interface ReportJsonResponse {
  report: ScreeningReport;
  meta: { reportNumber: string; status: string; generatedAt: string };
}

export interface ReportRecord {
  id: string;
  consultation_id: string;
  analysis_id: string | null;
  review_id: string | null;
  report_number: string;
  schema_version: string;
  status: 'provisional' | 'final' | 'superseded';
  pdf_path: string | null;
  qr_token: string | null;
  generated_by: string | null;
  generated_at: string;
  sync_state: SyncState;
  created_at: string;
  updated_at: string;
}

export interface ReportVerification {
  valid: boolean;
  reportNumber?: string;
  status?: string;
  generatedAt?: string;
}

// ── Sync ─────────────────────────────────────────────────────────────────

export interface SyncQueueEntity {
  entity_type: string;
  status: string;
  count: number;
  oldest?: string | null;
  latest?: string | null;
}

export interface SyncStatus {
  districtConfigured: SqlBool;
  siteId: string;
  lastRunAt: string | null;
  schedulerRunning?: SqlBool;
  intervalMs?: number;
  queue: {
    byEntity: SyncQueueEntity[];
    byStatus: Record<string, number>;
    oldestPendingAt: string | null;
  };
  health: 'ok' | 'degraded' | 'attention_required';
}

export interface SyncConflict {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface SyncPushResult {
  skipped?: SqlBool;
  reason?: string;
  pushed?: number;
  conflicts?: number;
  failed?: number;
  [key: string]: unknown;
}

// ── Audit ────────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  sequence: number;
  case_id: string | null;
  actor_id: string | null;
  actor_role: Role | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  site_id: string | null;
  device_id: string | null;
  prev_hash: string | null;
  hash: string;
  sync_state: SyncState;
  created_at: string;
}

export interface AuditTrailResponse { caseId: string; entries: AuditEntry[]; }
export interface AuditVerifyResponse { valid: boolean; entries: number; brokenAt?: number | null; }

// ── Admin ────────────────────────────────────────────────────────────────

export interface AdminDashboard {
  site: { id: string; device: string };
  /** Headline counts for the administrator overview. All computed live. */
  overview: {
    totalPatients: number;
    totalTechnicians: number;
    totalReviewers: number;
    totalAdministrators: number;
    activeUsers: number;
    screeningsCompleted: number;
  };
  caseStatusCounts: Partial<Record<ConsultationStatus, number>>;
  gradeDistribution: Array<{ grade: DrGradeCode; count: number }>;
  districtStats: Array<{ district: string; count: number }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    actorRole: string | null;
    caseId: string | null;
    at: string;
  }>;
  storage: { freeBytes: number; totalBytes: number; freePercent: number; low: SqlBool };
  matlab: { adapter: string; available: SqlBool; matlabRuntime: SqlBool; note?: string };
  sync: SyncStatus;
}

// ── Generic envelopes ────────────────────────────────────────────────────

export interface Paginated<T> {
  items: T[];
  pagination: {
    page: number; limit: number; total: number;
    totalPages: number; hasNext: boolean; hasPrev: boolean;
  };
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

/** Shape of `details` on a 409 CLINICAL_SAFETY_VIOLATION from the notes linter. */
export interface ClinicalSafetyDetails {
  field: string;
  violations: Array<{ term: string; suggestion: string }>;
}

/** Admin user management. Roles an administrator may provision. */
export type ManageableRole = 'technician' | 'reviewer' | 'admin';

export interface CreateUserRequest {
  username: string;
  password: string;
  fullName: string;
  role: ManageableRole;
  facilityId?: string;
  registrationNo?: string;
}

export interface UpdateUserRequest {
  fullName?: string;
  role?: ManageableRole;
  facilityId?: string;
  registrationNo?: string;
}
