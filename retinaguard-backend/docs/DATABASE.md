# DATABASE.md

Two schemas, one shape. The **edge** schema (SQLite, `src/database/migrations/sqlite/`)
is the system of record at the point of care. The **district** schema
(PostgreSQL, `src/database/migrations/postgres/`) is an eventually-consistent
aggregate populated only through `SyncManager`. Column names deliberately
match 1:1 wherever the underlying type allows, so `syncManager.#upsert` can be
a thin generic upsert rather than a per-table mapper.

## Why SQLite at the edge

A rural PHC has no reliable network and, at times, no reliable power. SQLite
gives us:

- a single file that is trivial to back up (`cp retinaguard.db backup/`)
- WAL journal mode, so a crash mid-write does not corrupt the database
  (`PRAGMA journal_mode = WAL` in `sqliteDatabase.js`)
- zero operational dependency — no daemon to keep alive on a technician's laptop

## Running migrations

```bash
npm run migrate            # applies pending .sql files in filename order
npm run migrate:status     # shows applied/pending without changing anything
```

`src/database/migrationRunner.js` records a SHA-256 checksum per applied file
in `schema_migrations`. If a file is edited after being applied, the next run
throws rather than silently re-applying a different migration — this has
caught more than one "I just tweaked the CHECK constraint" mistake during
development.

## Entity-relationship summary

```
users ──< refresh_tokens
patients ──< consultations ──< images
                    │              │
                    │              └──< analysis_results ──< explainability
                    │                          │
                    ├──< reviews  ◄─────────────┘
                    └──< reports
consultations, patients, images, analysis_results, reviews, reports  →  sync_queue (outbox)
(all of the above)                                                    →  audit_logs (append-only)
```

## Table notes

- **`users`** — `role` is a hard CHECK constraint (`technician|reviewer|admin|district`),
  mirrored in `src/config/roles.js`. Progressive lockout fields
  (`failed_logins`, `locked_until`) support brute-force resistance on a
  shared-device PHC account with no external rate limiter available offline.

- **`patients` / `consultations`** — carry `version` (optimistic concurrency)
  and `sync_state` (`pending|synced|conflict`). `consultations.status` is a
  CHECK-constrained state machine; the *allowed* transitions are enforced in
  `consultationService.STATUS_TRANSITIONS`, not just at the column level,
  because "was this transition legal from *this* prior state" needs
  application logic.

- **`images`** — `capture_attempt` plus the `MAX_RECAPTURE_ATTEMPTS` config
  value implement the Blueprint's "max 2 recapture attempts, then escalate"
  rule (`imageService.upload`). `quality_reasons` is a JSON array of
  `{code, message}` so the technician app can render actionable retake
  guidance without a lookup table of its own.

- **`analysis_results`** — `grade_probabilities` is a JSON array of exactly 5
  calibrated class probabilities (ICDR 0–4), validated by
  `matlab/contracts.js:assertGradingResponse` before it is ever written.
  `stage_timings_ms` is a JSON object of measured per-stage latency
  (`quality_assessment`, `preprocess`, `anatomy_detection`, `dr_grading`,
  `lesion_detection`, `gradcam`, `total`) — these are the *only* legitimate
  input to the Simulink/SimEvents capacity model per the blueprint's "no
  invented numbers" rule. `audit_sampled` marks the random QA sample over
  auto-cleared (non-referable) cases.

- **`explainability`** — one row per layer (`gradcam`, `lesion`, `anatomy`)
  per analysis. `disagreement_flag` is set when Layer 1 (attention) and
  Layer 2 (lesion evidence) conflict — see
  `clinicalSafetyService.evaluateAbstention`.

- **`reviews`** — `UNIQUE(consultation_id)` enforces "one adjudication per
  case." `agreement` is computed at write time by comparing
  `reviewer_grade_code` to the AI's `dr_grade_code`; `override_reason` is only
  ever populated when `agreement = false`.

- **`reports`** — `json_payload` is the frozen `ScreeningReport` shape
  (`docs/interfaces.ts`). Regenerating a report supersedes (not deletes) the
  previous one, so a report that was already printed and handed to a patient
  remains reconstructable from history.

- **`sync_queue`** — the offline outbox. `idempotency_key` is
  `sha256(siteId|entityType|entityId|operation|version)`
  (`utils/ids.js:deterministicKey`), so re-queuing the same logical change
  never creates a duplicate outbox row, and a retried push after a dropped
  connection can't double-apply on the district side either (see
  `sync_receipts` on the PostgreSQL side).

- **`audit_logs`** — append-only by SQL trigger (`trg_audit_logs_no_update`,
  `trg_audit_logs_no_delete`), hash-chained by application code
  (`auditRepository.append`/`verifyChain`). `sequence` is assigned by trigger
  at insert time so ordering survives clock skew across sites.

- **`idempotency_keys`** — HTTP-level replay protection, separate from the
  sync outbox: this guards against a technician double-tapping "Save" on a
  slow UI, not against edge↔district replication.

## Views

- **`v_review_queue`** — joins consultation + patient + latest analysis +
  image for the reviewer app in one query, pre-filtered to reviewable
  statuses.
- **`v_sync_status`** — outbox counts grouped by entity type and status, used
  by `GET /sync/status` and the admin dashboard.

## PostgreSQL-specific notes

- `sync_receipts` is the district-side idempotency ledger: a duplicate push
  (same `idempotency_key`) is recognised and returns `duplicate` without
  touching clinical tables again.
- A district row with a **higher** `version` than the incoming push is
  treated as a genuine conflict (`result = 'conflict'` in `sync_receipts`,
  surfaced via `GET /sync/conflicts`) rather than silently overwritten —
  last-writer-wins is explicitly rejected for clinical data.
- `REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC` — the immutability
  guarantee is enforced at the grant level on the district side, since
  SQLite-style triggers aren't the natural PostgreSQL idiom for this.
