'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const { hashObject } = require('../../utils/hash');

/**
 * Seed script for PDF Report Test Scenarios:
 *   Scenario 2: Reviewer modified AI grade (TEST-PDF-CASE-002)
 *
 * Fully idempotent using fixed IDs with SELECT-before-INSERT.
 * Skips insertion if the case already exists so the second run inserts nothing.
 */
async function seedPdfTestCases(dbPath) {
  const db = new Database(dbPath || path.resolve(__dirname, '../../../data/retinaguard.db'));
  db.pragma('foreign_keys = ON');

  const existingCase = db.prepare("SELECT id FROM consultations WHERE id = 'TEST-PDF-CASE-002'").get();
  if (existingCase) {
    console.log('Case TEST-PDF-CASE-002 already exists. Skipping insertion (0 rows inserted).');
    db.close();
    return { success: true, inserted: 0 };
  }

  const tech = db.prepare("SELECT id FROM users WHERE username = 'tanu.tech'").get()
    || db.prepare("SELECT id FROM users WHERE role = 'technician'").get();
  const reviewer = db.prepare("SELECT id, registration_no FROM users WHERE username = 'reviewer.doc'").get()
    || db.prepare("SELECT id, registration_no FROM users WHERE role = 'reviewer'").get();

  const techId = tech?.id || '01b3445a-4c90-43f1-ba97-ff10b629860b';
  const reviewerId = reviewer?.id || 'ca0055d7-c6da-494e-adc8-cbf00533bba1';
  const sampleImagePath = 'fundus/2026-09-15/64e378c5-701c-4dd0-9d44-1c0c299fab9e-right-1.jpeg';
  const sampleSha = '97b0c51069846b17561ccd6ce82a801ef6fdb1d3ab2a7acca2e98665bafe2f02';

  let insertedCount = 0;

  const insertTx = db.transaction(() => {
    // ─── Scenario 2: Reviewer Modified AI Grade ──────────────────────────────
    // 1. Patient
    const existingPat = db.prepare("SELECT id FROM patients WHERE id = 'TEST-PDF-PAT-002'").get();
    if (!existingPat) {
      db.prepare(`
        INSERT INTO patients (
          id, patient_code, full_name, age, gender, phone, village, district, state,
          diabetes_type, diabetes_history, diabetes_duration_years, facility_id, created_by, sync_state
        ) VALUES (
          'TEST-PDF-PAT-002', 'PAT-INDORE-102', 'Test Patient B', 61, 'female', '9876543211',
          'Depalpur', 'Indore', 'Madhya Pradesh', 'type2', 'yes', 11.0, 'PHC-INDORE-01', ?, 'synced'
        )
      `).run(techId);
    }

    // 2. Consultation (Status: review_complete, Priority: P1 to match grade 2)
    db.prepare(`
      INSERT INTO consultations (
        id, case_number, patient_id, technician_id, reviewer_id, status, triage_priority,
        site_id, device_id, identity_confirmed, recapture_attempts, final_grade_code,
        final_referable, consultation_date, sync_state
      ) VALUES (
        'TEST-PDF-CASE-002', 'RG-PHCINDORE01-20260917-S202', 'TEST-PDF-PAT-002', ?, ?,
        'review_complete', 'P1', 'PHC-INDORE-01', 'FUNDUS-CAM-001', 1, 1, 2, 1,
        '2026-09-17 11:15:00', 'synced'
      )
    `).run(techId, reviewerId);

    // 3. Image (Quality score: 0.81, Grade B)
    db.prepare(`
      INSERT INTO images (
        id, consultation_id, patient_id, laterality, file_path, mime_type, size_bytes,
        sha256, capture_attempt, quality_grade, quality_score, status, device_id, captured_at, sync_state
      ) VALUES (
        'TEST-PDF-IMG-002', 'TEST-PDF-CASE-002', 'TEST-PDF-PAT-002', 'left', ?, 'image/jpeg', 17742,
        ?, 2, 'B', 0.81, 'analysed', 'FUNDUS-CAM-001', '2026-09-17 11:20:00', 'synced'
      )
    `).run(sampleImagePath, sampleSha);

    // 4. Analysis Results (AI Grade: 1 - Mild NPDR, Confidence 0.742 above threshold)
    db.prepare(`
      INSERT INTO analysis_results (
        id, image_id, consultation_id, status, model_version, model_hash, preprocessing_hash,
        dr_grade_code, dr_grade_label, confidence, referable_probability, referable, abstained,
        triage_priority, completed_at, sync_state
      ) VALUES (
        'TEST-PDF-ANA-002', 'TEST-PDF-IMG-002', 'TEST-PDF-CASE-002', 'completed', 'v1.2.0',
        'sha256-m120', 'sha256-pre', 1, 'Mild NPDR', 0.742, 0.38, 0, 0, 'P2',
        '2026-09-17 11:21:00', 'synced'
      )
    `).run();

    // 5. Review (Reviewer Grade: 2, Agreement: 0, Decision: refer, Override Reason filled)
    db.prepare(`
      INSERT INTO reviews (
        id, consultation_id, analysis_id, reviewer_id, ai_grade_code, reviewer_grade_code,
        agreement, decision, referral_urgency, override_reason, notes, review_completed_at, sync_state
      ) VALUES (
        'TEST-PDF-REV-002', 'TEST-PDF-CASE-002', 'TEST-PDF-ANA-002', ?, 1, 2,
        0, 'refer', 'within_1_month',
        'Multiple blot hemorrhages and hard exudates detected in superior nasal quadrant; upgraded from mild to moderate',
        'Referral recommended for moderate NPDR evaluation at district hospital within 1 month.',
        '2026-09-17 11:45:00', 'synced'
      )
    `).run(reviewerId);

    // 6. Audit Log Row (matching application pattern in reviewerService.js / auditRepository.js)
    const existingAudit = db.prepare("SELECT id FROM audit_logs WHERE entity_id = 'TEST-PDF-REV-002' AND action = 'review_decided'").get();
    if (!existingAudit) {
      const lastRow = db.prepare("SELECT hash FROM audit_logs ORDER BY sequence DESC, created_at DESC LIMIT 1").get();
      const prevHash = lastRow?.hash || null;
      const entryId = 'AUDIT-TEST-PDF-REV-002';
      const createdAt = '2026-09-17 11:45:01';
      const afterState = JSON.stringify({ decision: 'refer', reviewerGradeCode: 2, agreement: 0 });
      const material = {
        id: entryId,
        case_id: 'TEST-PDF-CASE-002',
        actor_id: reviewerId,
        action: 'review_decided',
        entity_type: 'review',
        entity_id: 'TEST-PDF-REV-002',
        before_state: null,
        after_state: afterState,
        created_at: createdAt,
        prev_hash: prevHash,
      };
      const hash = hashObject(material);

      db.prepare(`
        INSERT INTO audit_logs (
          id, case_id, actor_id, actor_role, action, entity_type, entity_id,
          after_state, site_id, device_id, prev_hash, hash, sync_state, created_at
        ) VALUES (
          ?, 'TEST-PDF-CASE-002', ?, 'reviewer', 'review_decided', 'review', 'TEST-PDF-REV-002',
          ?, 'PHC-INDORE-01', 'FUNDUS-CAM-001', ?, ?, 'synced', ?
        )
      `).run(entryId, reviewerId, afterState, prevHash, hash, createdAt);
    }

    insertedCount = 1;
  });

  insertTx();
  db.close();

  console.log(`Successfully inserted Scenario 2 case: TEST-PDF-CASE-002 (${insertedCount} consultation with patient, image, analysis, review, and audit log).`);
  return {
    success: true,
    inserted: insertedCount,
    seeded: ['TEST-PDF-CASE-002 (Modified)']
  };
}

if (require.main === module) {
  seedPdfTestCases()
    .then((res) => {
      console.log('Seed execution completed:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = { seedPdfTestCases };
