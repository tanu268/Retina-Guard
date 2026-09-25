# RetinaGuard Engineer-2 Frozen Baseline

**Date:** 2026-09-23
**State:** VERIFIED RELEASE CANDIDATE (Engineer 2 Phase)

## 1. Repository State
- **Status:** Verified clean-room reproducible.
- **Commit/Hash:** Derived from local working tree `task-920` regression run.

## 2. Engineer-2 API Routes (Verified)
- `POST /api/v1/cases` (Creates case and uploads image)
- `GET /api/v1/case/:case_uuid` (Retrieves full case context)
- `POST /api/v1/case/:case_uuid/review` (Submits a human review)
- `GET /api/v1/queue` (Retrieves reviewer queue)
- `GET /api/v1/report/:case_uuid` (Generates final report)
- `GET /api/v1/model` (Exposes model configuration)

## 3. Contracts
- **Request Contracts:** `patient_id` and `image` are required to create cases.
- **Response Contracts:** `case_uuid` is the primary key across the system.
- **DTOs:** `ReviewQueueItem` contains `severity` and `quality_score`.

## 4. Database Assumptions
- SQLite database via `sqliteDatabase.js`.
- Entity uniqueness enforced at DB layer (e.g., `consultation_id` in reviews).
- Foreign Key Constraints are active.

## 5. Model Configuration
- **Model Adapter:** Configured via `config.matlab.adapter` (e.g., `mock` or `mvm`).
- **Mock Behavior:** Mock adapter explicitly throws a constraint error preventing generation of clinical synthetic AI grades without the CLI active. (VERIFIED)

## 6. Authentication/RBAC Behavior
- JWT bearer tokens.
- Roles: `technician`, `reviewer`, `district`, `sysadmin`.
- Endpoint isolation verified. (VERIFIED)

## 7. Offline/Sync Behavior
- IndexedDB offline persistence of cases.
- Sync mechanism reconciles offline cases when network is restored. (VERIFIED)

## 8. Idempotency Behavior
- Concurrent review submissions trigger SQLite UNIQUE constraint on `consultation_id`, safely reverting exactly one request with a normalized 409 Conflict. (VERIFIED)

## 9. Accepted Baseline
- **Browser Artifacts:** E2E flows (Technician, Reviewer, Offline Sync) all visually proven.
- **Golden Fixture:** `e2ePipeline.test.js` passes.
- **Clean-Room:** `npm run test` executes perfectly. 19 test suites, 87 total tests (85 pass, 2 skipped due to intended mock behavior).

*Note: This baseline is FROZEN. No modifications to these constraints are allowed without explicit evidence-backed justification.*
