-- ============================================================================
-- RetinaGuard edge schema — 004_diabetes_history
--
-- Adds an explicit Yes/No/Unknown diabetes-history field, additive to the
-- existing diabetes_type column.
--
-- diabetes_type is CHECK-constrained to ('type1','type2','gestational',
-- 'unknown') — there is no way to represent "confirmed no diabetes" in it,
-- only "unknown". The registration form's spec requires three states (Yes /
-- No / Unknown) driving whether duration and HbA1c are shown at all, which
-- needs a field of its own rather than a change to the existing CHECK
-- constraint — altering that constraint would have required rebuilding the
-- table and every row on it for no functional gain.
--
-- Existing rows: diabetes_type is backfilled to diabetes_history so no row
-- loses information the form already collected.
-- ============================================================================

ALTER TABLE patients ADD COLUMN diabetes_history TEXT
  CHECK (diabetes_history IS NULL OR diabetes_history IN ('yes','no','unknown'));

UPDATE patients
SET diabetes_history = CASE
  WHEN diabetes_type IS NULL THEN NULL
  WHEN diabetes_type = 'unknown' THEN 'unknown'
  ELSE 'yes'
END
WHERE diabetes_history IS NULL;

CREATE INDEX IF NOT EXISTS ix_patients_diabetes_history ON patients(diabetes_history);
