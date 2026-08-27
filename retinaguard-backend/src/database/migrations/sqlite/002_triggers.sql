-- ============================================================================
-- 002_triggers — updated_at maintenance and audit sequence numbering
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS trg_users_updated_at AFTER UPDATE ON users
BEGIN UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_patients_updated_at AFTER UPDATE ON patients
BEGIN UPDATE patients SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_consultations_updated_at AFTER UPDATE ON consultations
BEGIN UPDATE consultations SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_images_updated_at AFTER UPDATE ON images
BEGIN UPDATE images SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_analysis_updated_at AFTER UPDATE ON analysis_results
BEGIN UPDATE analysis_results SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_reviews_updated_at AFTER UPDATE ON reviews
BEGIN UPDATE reviews SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_reports_updated_at AFTER UPDATE ON reports
BEGIN UPDATE reports SET updated_at = datetime('now') WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_sync_queue_updated_at AFTER UPDATE ON sync_queue
BEGIN UPDATE sync_queue SET updated_at = datetime('now') WHERE id = NEW.id; END;

-- Monotonic sequence for the audit hash chain.
CREATE TRIGGER IF NOT EXISTS trg_audit_sequence AFTER INSERT ON audit_logs
WHEN NEW.sequence IS NULL
BEGIN
  UPDATE audit_logs
     SET sequence = (SELECT COALESCE(MAX(sequence), 0) + 1 FROM audit_logs WHERE id <> NEW.id)
   WHERE id = NEW.id;
END;
