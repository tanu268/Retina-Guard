-- ============================================================================
-- 003_views — read models for the reviewer queue and district dashboards
-- ============================================================================

DROP VIEW IF EXISTS v_review_queue;
CREATE VIEW v_review_queue AS
SELECT
  c.id                  AS consultation_id,
  c.case_number,
  c.status,
  c.triage_priority,
  c.consultation_date,
  c.recapture_attempts,
  p.id                  AS patient_id,
  p.patient_code,
  p.full_name           AS patient_name,
  p.age,
  p.gender,
  a.id                  AS analysis_id,
  a.dr_grade_code,
  a.dr_grade_label,
  a.confidence,
  a.referable,
  a.abstained,
  a.abstain_reason,
  a.audit_sampled,
  a.completed_at        AS analysed_at,
  i.id                  AS image_id,
  i.laterality,
  i.quality_grade
FROM consultations c
JOIN patients p            ON p.id = c.patient_id
LEFT JOIN analysis_results a ON a.consultation_id = c.id AND a.status IN ('completed','abstained')
LEFT JOIN images i           ON i.id = a.image_id
WHERE c.deleted_at IS NULL
  AND c.status IN ('awaiting_review','analysis_complete','quality_failed');

DROP VIEW IF EXISTS v_sync_status;
CREATE VIEW v_sync_status AS
SELECT entity_type, status, COUNT(*) AS count, MIN(created_at) AS oldest, MAX(updated_at) AS latest
FROM sync_queue
GROUP BY entity_type, status;
