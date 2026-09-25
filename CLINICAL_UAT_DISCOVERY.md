# RetinaGuard Clinical UAT Discovery

## Frozen Input Verification
- **Input State:** `VERIFIED RELEASE CANDIDATE` (From Integration Phase)
- **Commit/Hash:** Derived from local working tree task-1060 regression.
- **Traceability Matrix:** Present (`INTEGRATION_TRACEABILITY_MATRIX.md`).
- **Evidence Register:** Present (`INTEGRATION_EVIDENCE_REGISTER.json`).

## Component Inspection
- **Frontend:** React application, handles offline synchronization via IDB.
- **Backend:** Node.js Express API.
- **Database:** SQLite with local migration and seed scripts (`npm run migrate:dev`, `npm run seed:dev`).
- **Authentication/RBAC:** JWT-based, distinguishing Technician and Reviewer roles (`authenticate.js`, `authorize.js`).
- **Case Lifecycle:** `awaiting_image` -> `awaiting_analysis` -> `awaiting_review` -> `completed`.
- **Image Pipeline:** Multer upload + `imageService.js` quality checks.
- **AI/Inference Adapter:** MATLAB integration via `matlabService.js` (currently using mocked execution in test/dev).
- **Reviewer Workflow:** Role-gated queue serving `ReviewQueueItem` with payload containing AI severity and quality score.
- **Offline Persistence & Sync:** Handled via frontend Service Worker/IDB `syncService.ts`.
- **Logs:** Pino structured logger.
- **Tests:** 19 integration/unit test suites (`npm run test`).

## Environment / Configuration
- Requires Node.js.
- Requires `cross-env` for environment control.
- `MATLAB_RUNTIME_PATH` required for real inference.

## Known Limitations
- The system uses a mock Matlab inference adapter because the actual physical clinical ML runtime is unavailable in this UAT environment.

*No production code changes were made during this discovery phase.*
