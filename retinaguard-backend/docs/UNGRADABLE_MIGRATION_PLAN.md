# RetinaGuard: Ungradable Migration Plan (Prompt 7.2)

**Status:** PLAN ONLY — DRAFT: NOT APPLIED  
**Target:** Design how RetinaGuard represents an ungradable image at the reviewer adjudication step without corrupting DR clinical grading.  
**Constraint:** No database schema, migrations, or application code are modified in this task.

---

## Step 1: Current Flow Analysis & Code Findings

### 1.1 Allowed Values of `reviews.decision` and `reviews.agreement`
From [retinaguard-backend/src/database/migrations/sqlite/001_init.sql](file:///c:/Users/HP/OneDrive/Documents/ret/Retina-Guard/retinaguard-backend/src/database/migrations/sqlite/001_init.sql#L190-L192):
```sql
agreement           INTEGER CHECK (agreement IN (0,1)),
decision            TEXT NOT NULL CHECK (decision IN ('refer','routine_recall','repeat_imaging','escalate')),
```

- **`reviews.agreement`**:
  - `1`: Reviewer agrees with AI screening grade
  - `0`: Reviewer modified / overrode AI screening grade
  - `NULL`: AI abstained (no model grade was issued)
- **`reviews.decision`**:
  - `'refer'`: Patient referred for specialist ophthalmology evaluation
  - `'routine_recall'`: Patient scheduled for routine screening recall
  - `'repeat_imaging'`: Send back for new image acquisition
  - `'escalate'`: Send to higher center / ophthalmologist

---

### 1.2 Reviewer `repeat_imaging` Flow & Consultation Status
In [retinaguard-backend/src/services/reviewerService.js](file:///c:/Users/HP/OneDrive/Documents/ret/Retina-Guard/retinaguard-backend/src/services/reviewerService.js#L81-L88):
```javascript
const reviewerGrade = gradeByCode(input.reviewerGradeCode);
await this.consultations.update(consultationId, {
  status: 'review_complete',
  reviewer_id: actor.id,
  final_grade_code: input.reviewerGradeCode,
  final_referable: reviewerGrade?.referable ?? (input.decision === 'refer'),
});
```
- When a reviewer selects `repeat_imaging`, `reviewerService.decide` unconditionally transitions the consultation to `status: 'review_complete'`.
- It does **not** revert the consultation to `capture_pending` or `quality_failed`.

---

### 1.3 Maximum Recapture Limit in Code
Defined in [retinaguard-backend/src/config/index.js](file:///c:/Users/HP/OneDrive/Documents/ret/Retina-Guard/retinaguard-backend/src/config/index.js#L61) and enforced in [retinaguard-backend/src/services/imageService.js](file:///c:/Users/HP/OneDrive/Documents/ret/Retina-Guard/retinaguard-backend/src/services/imageService.js#L36-L47):
```javascript
const attempts = await this.repo.attemptCount(consultationId, laterality);
if (attempts > this.config.clinical.maxRecaptureAttempts) {
  await this.audit.record({
    action: AuditService.ACTIONS.RECAPTURE_EXHAUSTED, entityType: 'consultation',
    entityId: consultationId, caseId: consultationId, actor, req,
    reason: `laterality=${laterality} attempts=${attempts}`,
  });
  throw new ClinicalSafetyError(
    `Maximum recapture attempts (${this.config.clinical.maxRecaptureAttempts}) reached for the ${laterality} eye. Escalate to human review instead of retaking.`,
    { laterality, attempts, maxAttempts: this.config.clinical.maxRecaptureAttempts },
  );
}
```
- `maxRecaptureAttempts` defaults to **2** (configurable via `MAX_RECAPTURE_ATTEMPTS`).
- When the attempt count exceeds `maxRecaptureAttempts`, further image uploads for that eye are blocked with `ClinicalSafetyError`, and the case must be escalated to a human reviewer.

---

### 1.4 Review Granularity & Foreign Keys
From [retinaguard-backend/src/database/migrations/sqlite/001_init.sql](file:///c:/Users/HP/OneDrive/Documents/ret/Retina-Guard/retinaguard-backend/src/database/migrations/sqlite/001_init.sql#L183-L203):
```sql
CREATE TABLE IF NOT EXISTS reviews (
  id                  TEXT PRIMARY KEY,
  consultation_id     TEXT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  analysis_id         TEXT REFERENCES analysis_results(id) ON DELETE SET NULL,
  reviewer_id         TEXT NOT NULL REFERENCES users(id),
  ...
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_reviews_consultation ON reviews(consultation_id);
```
- The review is stored **per consultation (case)**, enforced by the unique index `ux_reviews_consultation`.
- It does **not** reference `image_id` or `laterality`.
- While images are per-eye (`laterality IN ('left','right')`), the human clinical review represents the case-level adjudication.

---

### 1.5 Nullability of `consultations.triage_priority`
From [retinaguard-backend/src/database/migrations/sqlite/001_init.sql](file:///c:/Users/HP/OneDrive/Documents/ret/Retina-Guard/retinaguard-backend/src/database/migrations/sqlite/001_init.sql#L81):
```sql
triage_priority    TEXT CHECK (triage_priority IN ('P0','P1','P2','P3')),
```
- `triage_priority` does **NOT** have a `NOT NULL` constraint.
- It **does allow NULL**.

---

### 1.6 Lifecycle Statuses After `review_complete` & Case Closure
From [retinaguard-backend/src/database/migrations/sqlite/001_init.sql](file:///c:/Users/HP/OneDrive/Documents/ret/Retina-Guard/retinaguard-backend/src/database/migrations/sqlite/001_init.sql#L77-L80) and [retinaguard-backend/src/services/consultationService.js](file:///c:/Users/HP/OneDrive/Documents/ret/Retina-Guard/retinaguard-backend/src/services/consultationService.js#L65-L79, #L109):
```javascript
ConsultationService.STATUS_TRANSITIONS = Object.freeze({
  ...
  awaiting_review: ['review_complete', 'cancelled'],
  review_complete: ['closed'],
  closed: [],
  cancelled: [],
});
```
- The only lifecycle status permitted after `review_complete` is **`closed`**.
- A case moves to `closed` via `PATCH /consultations/:id` with `{ status: 'closed' }`.
- Closure is permitted **only** when `existing.reviewer_id` is populated (`Cannot close a case without a recorded reviewer decision`), and automatically sets `closed_at = new Date().toISOString()`.

---

## Step 2: Full Affected-Files Matrix

| Area | Exact File Path | Modification Required |
| :--- | :--- | :--- |
| **SQLite Schema & Migrations** | `retinaguard-backend/src/database/migrations/sqlite/001_init.sql`<br>`retinaguard-backend/src/database/migrations/sqlite/005_reviewer_gradability.sql` | Rebuild `reviews` table: add `gradability`, make `reviewer_grade_code` nullable, add paired constraint. |
| **PostgreSQL District Schema** | `retinaguard-backend/src/database/migrations/postgres/001_init.sql`<br>`retinaguard-backend/src/database/migrations/postgres/003_reviewer_gradability.sql` | Add `gradability` column, drop NOT NULL on `reviewer_grade_code`, add paired check constraint. |
| **Sync Engine** | `retinaguard-backend/src/services/syncManager.js`<br>`retinaguard-backend/scripts/syncWorker.js`<br>`database/sync/sync.service.js` | Include `gradability` in review payload serialization and schema validation during district sync. |
| **Zod Review Validators** | `retinaguard-backend/src/modules/reviewer/reviewer.schema.js`<br>`retinaguard-backend/src/modules/reviewer/reviewer.validation.js` | `reviewerGradeCode` becomes `.optional().nullable()`, `gradability` becomes `z.enum(['gradable','ungradable'])`, enforce superRefine rule. |
| **Backend Services & Controllers** | `retinaguard-backend/src/services/reviewerService.js`<br>`retinaguard-backend/src/services/reportService.js`<br>`retinaguard-backend/src/services/pdfService.js`<br>`retinaguard-backend/src/modules/reviewer/reviewer.dto.js` | Handle `gradability === 'ungradable'`: bypass `gradeByCode`, format "Ungradable" in PDF/JSON report, adjust priority defaults. |
| **API Docs & Interfaces** | `retinaguard-backend/docs/interfaces.ts`<br>`retinaguard-backend/docs/API.md`<br>`retinaguard-backend/swagger/definition.js` | Update `Review`, `ReviewDecisionRequest`, and `ConsultationReport` interfaces to include `gradability`. |
| **Frontend UI & Forms** | `RetinaGuard-Frontend-v3/src/pages/reviewer/ReviewWorkspace.tsx`<br>`RetinaGuard-Frontend-v3/src/types/index.ts`<br>`RetinaGuard-Frontend-v3/src/services/api.ts`<br>`RetinaGuard-Frontend-v3/src/pages/shared/ReportPage.tsx` | Add "Ungradable" toggle/option in adjudication workspace, conditionally disable grade radio selector, require notes. |
| **Backend & Integration Tests** | `retinaguard-backend/tests/unit/reviewerService.test.js`<br>`retinaguard-backend/tests/integration/e2ePipeline.test.js`<br>`retinaguard-backend/tests/unit/clinicalSafetyService.test.js` | Add test cases for ungradable adjudication, validation rejection on missing note, and null grade check. |

---

## Step 3: Proposed Migration Design & Draft SQL

### 3.1 Design Confirmation
The proposed design is verified to fit the architecture cleanly:
- `reviews.gradability TEXT NOT NULL DEFAULT 'gradable' CHECK (gradability IN ('gradable','ungradable'))`
- `reviewer_grade_code` becomes nullable (`INTEGER CHECK (reviewer_grade_code IS NULL OR reviewer_grade_code BETWEEN 0 AND 4)`)
- Paired rule:
  ```sql
  CHECK (
    (gradability = 'gradable' AND reviewer_grade_code IS NOT NULL) OR
    (gradability = 'ungradable' AND reviewer_grade_code IS NULL AND notes IS NOT NULL AND length(trim(notes)) > 0)
  )
  ```
- Backwards compatible: all existing rows default to `'gradable'`, retaining existing numeric grades and audit hashes.

---

### 3.2 Draft SQLite Migration (`005_reviewer_gradability.sql`)

```sql
-- ============================================================================
-- DRAFT: NOT APPLIED
-- RetinaGuard SQLite Edge Migration — 005_reviewer_gradability.sql
-- Rebuilds reviews table to allow ungradable clinical adjudication.
-- ============================================================================

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- 1. Create replacement table with gradability column and paired rule
CREATE TABLE reviews_new (
  id                  TEXT PRIMARY KEY,
  consultation_id     TEXT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  analysis_id         TEXT REFERENCES analysis_results(id) ON DELETE SET NULL,
  reviewer_id         TEXT NOT NULL REFERENCES users(id),
  ai_grade_code       INTEGER CHECK (ai_grade_code IS NULL OR ai_grade_code BETWEEN 0 AND 4),
  reviewer_grade_code INTEGER CHECK (reviewer_grade_code IS NULL OR reviewer_grade_code BETWEEN 0 AND 4),
  gradability         TEXT NOT NULL DEFAULT 'gradable' CHECK (gradability IN ('gradable','ungradable')),
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
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (
    (gradability = 'gradable' AND reviewer_grade_code IS NOT NULL) OR
    (gradability = 'ungradable' AND reviewer_grade_code IS NULL AND notes IS NOT NULL AND length(trim(notes)) > 0)
  )
);

-- 2. Copy existing data (all historical reviews default to 'gradable')
INSERT INTO reviews_new (
  id, consultation_id, analysis_id, reviewer_id, ai_grade_code, reviewer_grade_code,
  gradability, agreement, decision, referral_urgency, override_reason, notes,
  review_started_at, review_completed_at, duration_seconds, sync_state, created_at, updated_at
)
SELECT
  id, consultation_id, analysis_id, reviewer_id, ai_grade_code, reviewer_grade_code,
  'gradable', agreement, decision, referral_urgency, override_reason, notes,
  review_started_at, review_completed_at, duration_seconds, sync_state, created_at, updated_at
FROM reviews;

-- 3. Drop legacy table and rename replacement
DROP TABLE reviews;
ALTER TABLE reviews_new RENAME TO reviews;

-- 4. Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS ux_reviews_consultation ON reviews(consultation_id);
CREATE INDEX IF NOT EXISTS ix_reviews_reviewer ON reviews(reviewer_id, review_completed_at);
CREATE INDEX IF NOT EXISTS ix_reviews_gradability ON reviews(gradability);

-- 5. Recreate triggers
CREATE TRIGGER IF NOT EXISTS trg_reviews_updated_at AFTER UPDATE ON reviews
BEGIN
  UPDATE reviews SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- 6. Foreign key integrity check
PRAGMA foreign_key_check;

COMMIT;

PRAGMA foreign_keys = ON;
```

---

### 3.3 Draft PostgreSQL Migration (`003_reviewer_gradability.sql`)

```sql
-- ============================================================================
-- DRAFT: NOT APPLIED
-- RetinaGuard PostgreSQL District Migration — 003_reviewer_gradability.sql
-- ============================================================================

BEGIN;

-- 1. Add gradability column
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS gradability VARCHAR(20) NOT NULL DEFAULT 'gradable'
  CHECK (gradability IN ('gradable', 'ungradable'));

-- 2. Relax NOT NULL constraint on reviewer_grade_code
ALTER TABLE reviews ALTER COLUMN reviewer_grade_code DROP NOT NULL;

-- 3. Add check constraint for valid grade code values
ALTER TABLE reviews ADD CONSTRAINT chk_reviews_reviewer_grade_range
  CHECK (reviewer_grade_code IS NULL OR reviewer_grade_code BETWEEN 0 AND 4);

-- 4. Add paired gradability and notes enforcement constraint
ALTER TABLE reviews ADD CONSTRAINT chk_reviews_gradability_paired
  CHECK (
    (gradability = 'gradable' AND reviewer_grade_code IS NOT NULL) OR
    (gradability = 'ungradable' AND reviewer_grade_code IS NULL AND notes IS NOT NULL AND length(trim(notes)) > 0)
  );

-- 5. Create index for query performance on district node
CREATE INDEX IF NOT EXISTS ix_reviews_gradability ON reviews(gradability);

COMMIT;
```

---

## Step 4: Open Questions for Team Decision

The following decisions require explicit team alignment:

1. **Final Priority for Ungradable Cases**:
   - Option A: Assign `P1` (consistent with `clinicalSafetyService.js` line 74: `if (qualityGrade === 'C') return 'P1'`).
   - Option B: Assign `P0` (consistent with Blueprint §06: ungradeable after retry budget routes to P0 because an ungradeable image on a diabetic patient may be obscuring advanced disease like vitreous haemorrhage).
   - Option C: Assign `P2` (consistent with `constants.js` line 52: `P2: 'P2', // Abstained / ungradeable / explanation disagreement`).
   - Option D: Leave `triage_priority` NULL on the consultation.
2. **Consultation Lifecycle Status After Exhausted Recaptures**:
   - Option A: Transition directly to `review_complete` with `decision: 'refer'` or `decision: 'repeat_imaging'`.
   - Option B: Introduce a distinct status such as `ungradable_escalated` or keep in `quality_failed` until ophthalmologist sign-off.
3. **Scope of Migration**:
   - Should missing fields (`DME status`, `referral_center`, and `next_screening_date`) be added simultaneously in this table rebuild migration, or reserved for a subsequent migration?
4. **Facility / Referral Hospital Schema Verification**:
   - Investigation confirms **no dedicated `facilities` or `phc` table exists in either SQLite or PostgreSQL**.
   - `facility_id` exists solely as a string identifier column on `users` and `patients`, with `site_id` on `consultations`.
   - Neither schema currently holds a `referral_hospital` column.
