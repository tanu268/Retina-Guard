-- ============================================================================
-- RetinaGuard edge schema — 001_init
-- SIH 2026 · PS 26038 · Team DrigShift
-- All primary keys are UUID v4 TEXT so an edge node can mint identifiers with
-- no coordination and sync them idempotently to the district node.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ─── users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  username       TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('technician','reviewer','admin','district')),
  facility_id    TEXT,
  registration_no TEXT,                 -- reviewer medical council registration
  is_active      INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  last_login_at  TEXT,
  failed_logins  INTEGER NOT NULL DEFAULT 0,
  locked_until   TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at     TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_users_role ON users(role) WHERE deleted_at IS NULL;

-- ─── refresh_tokens ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL,
  issued_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT NOT NULL,
  revoked_at   TEXT,
  user_agent   TEXT,
  ip_address   TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_refresh_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS ix_refresh_user ON refresh_tokens(user_id, revoked_at);

-- ─── patients ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id                 TEXT PRIMARY KEY,
  patient_code       TEXT NOT NULL,          -- site-scoped human-readable ID
  full_name          TEXT NOT NULL,
  age                INTEGER CHECK (age IS NULL OR (age >= 0 AND age <= 130)),
  gender             TEXT CHECK (gender IN ('male','female','other','undisclosed')),
  phone              TEXT,
  village            TEXT,
  district           TEXT,
  state              TEXT,
  diabetes_type      TEXT CHECK (diabetes_type IN ('type1','type2','gestational','unknown')),
  diabetes_duration_years REAL,
  hba1c              REAL,
  facility_id        TEXT,
  created_by         TEXT REFERENCES users(id),
  version            INTEGER NOT NULL DEFAULT 1,
  sync_state         TEXT NOT NULL DEFAULT 'pending' CHECK (sync_state IN ('pending','synced','conflict')),
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at         TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_patients_code ON patients(patient_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_patients_name ON patients(full_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_patients_sync ON patients(sync_state);

-- ─── consultations (the "case") ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultations (
  id                 TEXT PRIMARY KEY,
  case_number        TEXT NOT NULL,
  patient_id         TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  technician_id      TEXT REFERENCES users(id),
  reviewer_id        TEXT REFERENCES users(id),
  status             TEXT NOT NULL DEFAULT 'registered'
                     CHECK (status IN ('registered','capture_pending','quality_failed',
                                       'analysis_pending','analysis_complete',
                                       'awaiting_review','review_complete','closed','cancelled')),
  triage_priority    TEXT CHECK (triage_priority IN ('P0','P1','P2','P3')),
  notes              TEXT,
  site_id            TEXT NOT NULL,
  device_id          TEXT,
  identity_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (identity_confirmed IN (0,1)),
  recapture_attempts INTEGER NOT NULL DEFAULT 0,
  final_grade_code   INTEGER CHECK (final_grade_code IS NULL OR final_grade_code BETWEEN 0 AND 4),
  final_referable    INTEGER CHECK (final_referable IS NULL OR final_referable IN (0,1)),
  consultation_date  TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at          TEXT,
  version            INTEGER NOT NULL DEFAULT 1,
  sync_state         TEXT NOT NULL DEFAULT 'pending' CHECK (sync_state IN ('pending','synced','conflict')),
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at         TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_consultations_case_number ON consultations(case_number);
CREATE INDEX IF NOT EXISTS ix_consultations_patient ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS ix_consultations_status ON consultations(status, triage_priority);
CREATE INDEX IF NOT EXISTS ix_consultations_sync ON consultations(sync_state);

-- ─── images ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS images (
  id               TEXT PRIMARY KEY,
  consultation_id  TEXT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  patient_id       TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  laterality       TEXT NOT NULL CHECK (laterality IN ('left','right')),
  file_path        TEXT NOT NULL,
  original_name    TEXT,
  mime_type        TEXT NOT NULL,
  size_bytes       INTEGER NOT NULL,
  width            INTEGER,
  height           INTEGER,
  sha256           TEXT NOT NULL,
  capture_attempt  INTEGER NOT NULL DEFAULT 1,
  quality_grade    TEXT CHECK (quality_grade IN ('A','B','C')),
  quality_score    REAL,
  quality_reasons  TEXT,                 -- JSON array of actionable recapture reasons
  quality_checked_at TEXT,
  status           TEXT NOT NULL DEFAULT 'uploaded'
                   CHECK (status IN ('uploaded','quality_pass','quality_fail','superseded','analysed','deleted')),
  device_id        TEXT,
  captured_at      TEXT,
  sync_state       TEXT NOT NULL DEFAULT 'pending' CHECK (sync_state IN ('pending','synced','conflict')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at       TEXT
);
CREATE INDEX IF NOT EXISTS ix_images_consultation ON images(consultation_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_images_sha ON images(sha256);
CREATE INDEX IF NOT EXISTS ix_images_status ON images(status);

-- ─── analysis_results ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analysis_results (
  id                    TEXT PRIMARY KEY,
  image_id              TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  consultation_id       TEXT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  status                TEXT NOT NULL DEFAULT 'queued'
                        CHECK (status IN ('queued','running','completed','failed','abstained')),
  model_version         TEXT NOT NULL,
  model_hash            TEXT NOT NULL,
  preprocessing_hash    TEXT NOT NULL,
  dr_grade_code         INTEGER CHECK (dr_grade_code IS NULL OR dr_grade_code BETWEEN 0 AND 4),
  dr_grade_label        TEXT,
  grade_probabilities   TEXT,            -- JSON array, 5 calibrated class probabilities
  confidence            REAL,
  referable_probability REAL,
  referable             INTEGER CHECK (referable IS NULL OR referable IN (0,1)),
  abstained             INTEGER NOT NULL DEFAULT 0 CHECK (abstained IN (0,1)),
  abstain_reason        TEXT,
  triage_priority       TEXT CHECK (triage_priority IN ('P0','P1','P2','P3')),
  anatomy               TEXT,            -- JSON: optic disc / fovea / vessel metrics
  lesions               TEXT,            -- JSON array of lesion evidence
  stage_timings_ms      TEXT,            -- JSON: measured per-stage latency for SimEvents
  warnings              TEXT,            -- JSON array
  error_message         TEXT,
  audit_sampled         INTEGER NOT NULL DEFAULT 0 CHECK (audit_sampled IN (0,1)),
  started_at            TEXT,
  completed_at          TEXT,
  sync_state            TEXT NOT NULL DEFAULT 'pending' CHECK (sync_state IN ('pending','synced','conflict')),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_analysis_image ON analysis_results(image_id);
CREATE INDEX IF NOT EXISTS ix_analysis_consultation ON analysis_results(consultation_id);
CREATE INDEX IF NOT EXISTS ix_analysis_status ON analysis_results(status, triage_priority);

-- ─── explainability (layered evidence, Blueprint §06) ───────────────────────
CREATE TABLE IF NOT EXISTS explainability (
  id                TEXT PRIMARY KEY,
  analysis_id       TEXT NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
  layer             TEXT NOT NULL CHECK (layer IN ('gradcam','lesion','anatomy')),
  artifact_path     TEXT,
  artifact_type     TEXT CHECK (artifact_type IN ('png','json','svg')),
  payload           TEXT,                -- JSON: regions, scores, overlay metadata
  disagreement_flag INTEGER NOT NULL DEFAULT 0 CHECK (disagreement_flag IN (0,1)),
  disagreement_note TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_explain_analysis ON explainability(analysis_id, layer);

-- ─── reviews (human adjudication is mandatory) ──────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id                  TEXT PRIMARY KEY,
  consultation_id     TEXT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  analysis_id         TEXT REFERENCES analysis_results(id) ON DELETE SET NULL,
  reviewer_id         TEXT NOT NULL REFERENCES users(id),
  ai_grade_code       INTEGER CHECK (ai_grade_code IS NULL OR ai_grade_code BETWEEN 0 AND 4),
  reviewer_grade_code INTEGER NOT NULL CHECK (reviewer_grade_code BETWEEN 0 AND 4),
  agreement           INTEGER CHECK (agreement IN (0,1)),
  decision            TEXT NOT NULL CHECK (decision IN ('refer','routine_recall','repeat_imaging','escalate')),
  referral_urgency    TEXT CHECK (referral_urgency IN ('immediate','within_1_week','within_1_month','routine')),
  override_reason     TEXT,
  notes               TEXT,
  review_started_at   TEXT,
  review_completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  duration_seconds    INTEGER,
  sync_state          TEXT NOT NULL DEFAULT 'pending' CHECK (sync_state IN ('pending','synced','conflict')),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_reviews_consultation ON reviews(consultation_id);
CREATE INDEX IF NOT EXISTS ix_reviews_reviewer ON reviews(reviewer_id, review_completed_at);

-- ─── reports ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id              TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  analysis_id     TEXT REFERENCES analysis_results(id) ON DELETE SET NULL,
  review_id       TEXT REFERENCES reviews(id) ON DELETE SET NULL,
  report_number   TEXT NOT NULL,
  schema_version  TEXT NOT NULL DEFAULT '1.0.0',
  status          TEXT NOT NULL DEFAULT 'provisional' CHECK (status IN ('provisional','final','superseded')),
  json_payload    TEXT NOT NULL,
  pdf_path        TEXT,
  qr_token        TEXT NOT NULL,
  generated_by    TEXT REFERENCES users(id),
  generated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  sync_state      TEXT NOT NULL DEFAULT 'pending' CHECK (sync_state IN ('pending','synced','conflict')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_reports_number ON reports(report_number);
CREATE UNIQUE INDEX IF NOT EXISTS ux_reports_qr ON reports(qr_token);
CREATE INDEX IF NOT EXISTS ix_reports_consultation ON reports(consultation_id, status);

-- ─── sync_queue (store-and-forward outbox) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_queue (
  id              TEXT PRIMARY KEY,
  entity_type     TEXT NOT NULL CHECK (entity_type IN
                    ('patient','consultation','image','analysis_result','explainability','review','report','audit_log')),
  entity_id       TEXT NOT NULL,
  operation       TEXT NOT NULL CHECK (operation IN ('create','update','delete')),
  payload         TEXT NOT NULL,          -- JSON snapshot pushed to the district node
  idempotency_key TEXT NOT NULL,
  entity_version  INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','in_flight','synced','failed','conflict')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 8,
  next_attempt_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_error      TEXT,
  synced_at       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sync_idempotency ON sync_queue(idempotency_key);
CREATE INDEX IF NOT EXISTS ix_sync_dispatch ON sync_queue(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS ix_sync_entity ON sync_queue(entity_type, entity_id);

-- ─── audit_logs (append-only, hash-chained) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id              TEXT PRIMARY KEY,
  sequence        INTEGER,
  case_id         TEXT,                   -- consultation id where applicable
  actor_id        TEXT,
  actor_role      TEXT,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       TEXT,
  before_state    TEXT,
  after_state     TEXT,
  reason          TEXT,
  ip_address      TEXT,
  user_agent      TEXT,
  site_id         TEXT,
  device_id       TEXT,
  prev_hash       TEXT,
  hash            TEXT NOT NULL,
  sync_state      TEXT NOT NULL DEFAULT 'pending' CHECK (sync_state IN ('pending','synced','conflict')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_audit_case ON audit_logs(case_id, created_at);
CREATE INDEX IF NOT EXISTS ix_audit_actor ON audit_logs(actor_id, created_at);
CREATE INDEX IF NOT EXISTS ix_audit_entity ON audit_logs(entity_type, entity_id);

-- Immutability is enforced in the database, not only in application code.
CREATE TRIGGER IF NOT EXISTS trg_audit_logs_no_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW
WHEN OLD.sync_state = NEW.sync_state AND (OLD.sequence IS NOT NULL OR NEW.action != OLD.action OR NEW.hash != OLD.hash OR NEW.entity_id != OLD.entity_id)
BEGIN
  SELECT RAISE(ABORT, 'audit_logs is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_audit_logs_no_delete
BEFORE DELETE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'audit_logs is append-only');
END;

-- ─── idempotency_keys (HTTP-level replay protection) ────────────────────────
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key           TEXT PRIMARY KEY,
  endpoint      TEXT NOT NULL,
  user_id       TEXT,
  request_hash  TEXT NOT NULL,
  status_code   INTEGER,
  response_body TEXT,
  state         TEXT NOT NULL DEFAULT 'in_progress' CHECK (state IN ('in_progress','completed')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_idempotency_expiry ON idempotency_keys(expires_at);
