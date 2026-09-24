# RetinaGuard Integration Traceability Matrix

| Requirement | Contract | Implementation | Test | Runtime Artifact | Evidence ID | Evidence Type | Result |
|---|---|---|---|---|---|---|---|
| Case creation | API contract (`POST /cases`) | `cases.controller.js`, `consultationService.js` | INT-003, INT-005 | Phase 2 Recording | INT-001 | CROSS-VALIDATED | VERIFIED |
| AI analysis | Analysis contract | `analysisService.js`, `matlabService.js` | INT-006 | Integration Golden Fixture `task-1044.log` | INT-023 | INTEGRATION-VERIFIED | VERIFIED |
| Review | Review contract | `reviewerService.js` | INT-009, INT-010 | `integration_reviewer_e2e_1790181843713.webp` | INT-009 | INTEGRATION-VERIFIED | VERIFIED |
| Offline persistence | Sync contract | Local IDB (Frontend) | INT-011 | Offline E2E recorded in phase 2 | INT-011 | CROSS-VALIDATED | VERIFIED |
| Sync | Sync contract | `syncService.ts` (Frontend) | INT-013, INT-014 | Offline E2E recorded in phase 2 | INT-013 | CROSS-VALIDATED | VERIFIED |
| Security | Auth contract | `authorize.js`, `authenticate.js` | INT-016, INT-017 | Integration Regression `task-1060.log` | INT-016 | INTEGRATION-VERIFIED | VERIFIED |
| Clean room | Environment contract | `migrate.js`, `seed.js` | INT-024 | Integration Regression `task-1060.log` | INT-024 | INTEGRATION-VERIFIED | VERIFIED |
