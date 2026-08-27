-- ============================================================================
-- RetinaGuard DISTRICT schema (PostgreSQL) — 001_init
-- The district node aggregates cases pushed by many edge nodes. Rows carry the
-- originating site_id and the edge UUID, so a push is idempotent on (id).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS sites (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  district     TEXT,
  state        TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY,
  username      TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('technician','reviewer','admin','district')),
  facility_id   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username ON users(username) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS patients (
  id             UUID PRIMARY KEY,
  site_id        TEXT REFERENCES sites(id),
  patient_code   TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  age            INTEGER,
  gender         TEXT,
  phone          TEXT,
  village        TEXT,
  district       TEXT,
  state          TEXT,
  diabetes_type  TEXT,
  diabetes_duration_years REAL,
  hba1c          REAL,
  version        INTEGER NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_patients_site_code ON patients(site_id, patient_code) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS consultations (
  id                UUID PRIMARY KEY,
  site_id           TEXT REFERENCES sites(id),
  case_number       TEXT NOT NULL UNIQUE,
  patient_id        UUID NOT NULL REFERENCES patients(id),
  technician_id     UUID,
  reviewer_id       UUID,
  status            TEXT NOT NULL,
  triage_priority   TEXT,
  notes             TEXT,
  device_id         TEXT,
  recapture_attempts INTEGER NOT NULL DEFAULT 0,
  final_grade_code  INTEGER,
  final_referable   BOOLEAN,
  consultation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at         TIMESTAMPTZ,
  version           INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_cons_site_status ON consultations(site_id, status, triage_priority);

CREATE TABLE IF NOT EXISTS images (
  id              UUID PRIMARY KEY,
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id),
  laterality      TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  object_key      TEXT,
  mime_type       TEXT NOT NULL,
  size_bytes      BIGINT NOT NULL,
  sha256          TEXT NOT NULL,
  capture_attempt INTEGER NOT NULL DEFAULT 1,
  quality_grade   TEXT,
  quality_score   REAL,
  quality_reasons JSONB,
  status          TEXT NOT NULL,
  captured_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS analysis_results (
  id                    UUID PRIMARY KEY,
  image_id              UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  consultation_id       UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  status                TEXT NOT NULL,
  model_version         TEXT NOT NULL,
  model_hash            TEXT NOT NULL,
  preprocessing_hash    TEXT NOT NULL,
  dr_grade_code         INTEGER,
  dr_grade_label        TEXT,
  grade_probabilities   JSONB,
  confidence            REAL,
  referable_probability REAL,
  referable             BOOLEAN,
  abstained             BOOLEAN NOT NULL DEFAULT FALSE,
  abstain_reason        TEXT,
  triage_priority       TEXT,
  anatomy               JSONB,
  lesions               JSONB,
  stage_timings_ms      JSONB,
  warnings              JSONB,
  audit_sampled         BOOLEAN NOT NULL DEFAULT FALSE,
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS explainability (
  id                UUID PRIMARY KEY,
  analysis_id       UUID NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
  layer             TEXT NOT NULL,
  artifact_path     TEXT,
  artifact_type     TEXT,
  payload           JSONB,
  disagreement_flag BOOLEAN NOT NULL DEFAULT FALSE,
  disagreement_note TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id                  UUID PRIMARY KEY,
  consultation_id     UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  analysis_id         UUID,
  reviewer_id         UUID NOT NULL,
  ai_grade_code       INTEGER,
  reviewer_grade_code INTEGER NOT NULL,
  agreement           BOOLEAN,
  decision            TEXT NOT NULL,
  referral_urgency    TEXT,
  override_reason     TEXT,
  notes               TEXT,
  duration_seconds    INTEGER,
  review_completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_reviews_consultation ON reviews(consultation_id);

CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY,
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  analysis_id     UUID,
  review_id       UUID,
  report_number   TEXT NOT NULL UNIQUE,
  schema_version  TEXT NOT NULL,
  status          TEXT NOT NULL,
  json_payload    JSONB NOT NULL,
  pdf_path        TEXT,
  qr_token        TEXT NOT NULL UNIQUE,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY,
  site_id      TEXT,
  sequence     BIGINT,
  case_id      UUID,
  actor_id     UUID,
  actor_role   TEXT,
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    UUID,
  before_state JSONB,
  after_state  JSONB,
  reason       TEXT,
  ip_address   TEXT,
  user_agent   TEXT,
  device_id    TEXT,
  prev_hash    TEXT,
  hash         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_audit_site_case ON audit_logs(site_id, case_id, created_at);

REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;

-- Receipt ledger: every accepted push is recorded so pushes are idempotent
-- even if the edge node never receives the ACK and retries.
CREATE TABLE IF NOT EXISTS sync_receipts (
  idempotency_key TEXT PRIMARY KEY,
  site_id         TEXT,
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  operation       TEXT NOT NULL,
  entity_version  INTEGER NOT NULL DEFAULT 1,
  result          TEXT NOT NULL CHECK (result IN ('applied','duplicate','conflict','rejected')),
  detail          TEXT,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_receipts_entity ON sync_receipts(entity_type, entity_id);
