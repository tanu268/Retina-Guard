-- ============================================================================
-- RetinaGuard district schema — 002_diabetes_history
-- Postgres counterpart of sqlite/004_diabetes_history.sql — see that file for
-- the rationale.
-- ============================================================================

ALTER TABLE patients ADD COLUMN IF NOT EXISTS diabetes_history TEXT
  CHECK (diabetes_history IS NULL OR diabetes_history IN ('yes','no','unknown'));

UPDATE patients
SET diabetes_history = CASE
  WHEN diabetes_type IS NULL THEN NULL
  WHEN diabetes_type = 'unknown' THEN 'unknown'
  ELSE 'yes'
END
WHERE diabetes_history IS NULL;

CREATE INDEX IF NOT EXISTS ix_patients_diabetes_history ON patients(diabetes_history);
