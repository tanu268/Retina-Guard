/**
 * RetinaGuard frontend contract.
 *
 * These interfaces mirror the JSON actually returned by the backend
 * (src/matlab/contracts.js + the *.controller.js response shapes). Treat this
 * file as the frozen contract: changing a response shape without updating
 * this file — and documenting the change in API.md — is a breaking change.
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

// ── Auth ─────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: Role;
  facility_id: string | null;
  registration_no?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
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
  identity_confirmed: boolean;
  recapture_attempts: number;
  final_grade_code: DrGradeCode | null;
  final_referable: boolean | null;
  consultation_date: string | null;
  closed_at: string | null;
  version: number;
  sync_state: SyncState;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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

export interface UploadImageResponse {
  image: ImageRecord;
  quality: {
    qualityGrade: QualityGrade;
    qualityScore: number;
    gradeable: boolean;
    reasons: QualityReason[];
    metrics: { focusScore: number; illuminationUniformity: number; contrast: number; fieldCoverage: number };
    durationMs?: number;
  };
  recaptureAllowed: boolean;
  remainingAttempts: number;
}

// ── Analysis ─────────────────────────────────────────────────────────────

export interface LesionEvidence {
  type: 'microaneurysm' | 'haemorrhage' | 'hard_exudate' | 'soft_exudate' | 'neovascularisation' | 'venous_beading';
  bbox: { x: number; y: number; w: number; h: number };
  areaPx: number;
  confidence: number;
  quadrant: string;
}

export interface AnatomyResult {
  opticDisc: { detected: boolean; centre: { x: number; y: number }; radius: number; cupToDiscRatio: number; confidence: number };
  fovea: { detected: boolean; centre: { x: number; y: number }; confidence: number };
  vessels: { segmented: boolean; vesselDensity: number; arteryVeinRatio: number; tortuosityIndex: number; maskPath?: string | null };
  macularZone?: { withinTwoDiscDiameters: boolean };
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
  referable: boolean | null;
  abstained: boolean;
  abstain_reason: AbstainReason | null;
  triage_priority: TriagePriority | null;
  anatomy: AnatomyResult | null;
  lesions: LesionEvidence[] | null;
  stage_timings_ms: Record<string, number> | null;
  warnings: string[] | null;
  error_message: string | null;
  audit_sampled: boolean;
  started_at: string | null;
  completed_at: string | null;
  sync_state: SyncState;
  created_at: string;
  updated_at: string;
}

export interface AnalysisResponse {
  analysis: AnalysisResult;
  disclaimer: string;
  isDiagnosis: false;           // always false — see clinicalSafetyService
  humanReviewRequired: true;    // always true
  note: string | null;
}

export interface ExplainabilityLayers {
  gradcam: { artifact_path: string | null; payload: { regions: Array<{ x: number; y: number; w: number; h: number; intensity: number }>; targetLayer: string; peakIntensity: number } } | null;
  lesion: { payload: { lesions: LesionEvidence[]; counts: Record<string, number>; totalLesions: number } } | null;
  anatomy: { payload: AnatomyResult } | null;
}

// ── Reviewer ─────────────────────────────────────────────────────────────

export interface ReviewQueueItem {
  consultation_id: string;
  case_number: string;
  status: ConsultationStatus;
  triage_priority: TriagePriority;
  patient_name: string;
  age: number | null;
  gender: string | null;
  dr_grade_code: DrGradeCode | null;
  confidence: number | null;
  referable: boolean | null;
  abstained: boolean;
  quality_grade: QualityGrade | null;
}

export interface Review {
  id: string;
  consultation_id: string;
  analysis_id: string | null;
  reviewer_id: string;
  ai_grade_code: DrGradeCode | null;
  reviewer_grade_code: DrGradeCode;
  agreement: boolean | null;
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
  patient: { name: string; patientCode: string; age: number | null; gender: string | null; village: string | null; district: string | null; diabetesDurationYears: number | null } | null;
  images: { laterality: Laterality; fundusPath: string; gradcamPath: string | null } | null;
  result: {
    abstained: boolean;
    abstainReason: AbstainReason | null;
    gradeCode: DrGradeCode | null;
    gradeLabel: string | null;
    confidence: number | null;
    referableProbability: number | null;
    referable: boolean;
    triagePriority: TriagePriority | null;
    qualityGrade: QualityGrade | null;
    modelVersion: string;
    modelHash: string;
    warnings: string[];
  } | null;
  explainability: {
    gradcam: { regionCount: number; peakIntensity?: number } | null;
    lesion: { counts: Record<string, number> } | null;
    anatomy: { opticDiscDetected: boolean; foveaDetected: boolean; cupToDiscRatio?: number } | null;
    disagreement: boolean;
  };
  review: {
    gradeCode: DrGradeCode; gradeLabel?: string; agreement: boolean | null;
    decision: ReviewDecision; referralUrgency: ReferralUrgency | null;
    overrideReason: string | null; notes: string | null; completedAt: string;
  } | null;
  qrToken: string;
}

export interface ReportResponse {
  report: {
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
  };
}


// ── Sync ─────────────────────────────────────────────────────────────────

export interface SyncStatus {
  districtConfigured: boolean;
  siteId: string;
  lastRunAt: string | null;
  queue: {
    byEntity: Array<{ entity_type: string; status: string; count: number }>;
    byStatus: Record<string, number>;
    oldestPendingAt: string | null;
  };
  health: 'ok' | 'degraded' | 'attention_required';
}

// ── WebSocket events ─────────────────────────────────────────────────────

export type WsEventName = 'case_created' | 'case_updated' | 'review_completed' | 'sync_finished' | 'sync_conflict';

export interface WsEnvelope<T = unknown> {
  event: WsEventName;
  payload: T;
  at: string;
}

// ── Generic envelopes ────────────────────────────────────────────────────

export interface Paginated<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}
