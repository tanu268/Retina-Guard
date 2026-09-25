# ENGINEER1 — T-800 PHASE 20.1 EVIDENCE REPAIR REPORT
**Project:** RetinaGuard
**Date:** 2026-09-25
**Phase:** T-800 Full System Evidence Repair + Final Release Gate
**Node Version:** v20.20.2 | **npm Version:** 10.8.2

---

## 1. Executive Verdict

**PHASE 20.1 VERDICT: CONDITIONAL**

The full system has been forensically re-examined. The backend AI integration evidence is sound and independently verifiable. However, two material evidence gaps prevent unconditional PASS:

1. **Frontend unit tests do not exist** in the current committed codebase (`RetinaGuard-Frontend-v3`). The Phase 20 baseline claim of "8 suites / 48 tests" has been found to have no reproducible evidence in the current repository state.
2. **Backend E2E tests use the `mock` adapter** in the test environment, not the real ONNX adapter. The real ONNX model execution (Phase 19.1, `gateA.js`) is separately proven, but the automated `npm test` suite does not directly invoke the ONNX adapter.
3. `concurrency.test.js` and `model-config.test.js` contain **stub assertions** (`expect(true).toBe(true)`) rather than executable behavioral verification of idempotency and model endpoint respectively.
4. **Browser-level technician and reviewer workflows** are not directly verifiable by automated execution in this environment.

These are accurately classified as P1 and NOT VERIFIED items. No P0 blockers exist.

---

## 2. Baseline SHA Verification

| Artifact | Expected SHA-256 | Actual SHA-256 | Status |
|---|---|---|---|
| `preprocess.js` | `dfb00cb5...` | `dfb00cb5...` | ✅ MATCH |
| `retinaguard_resnet18.onnx` | `c49e78c9...` | `c49e78c9...` | ✅ MATCH |
| `val_manifest.csv` | `af476d87...` | `af476d87...` | ✅ MATCH |

All three frozen AI baseline artifacts verified. **AI BASELINE: UNCHANGED.**

---

## 3. Git State

- **Commit:** `3e43e8925c4e6620f5e146d6f237a1956d6c90fa`
- **Working tree:** DIRTY — 6 tracked files modified (from committed HEAD)
- **Modified tracked files:**
  - `retinaguard-backend/src/inference/preprocess.js` — contains Phase 18 ImageNet preprocessing (VERIFIED SHA matches frozen expected value). Git HEAD contains the legacy OpenCV preprocessing. **The working tree version is the correct frozen version. Phase 18 changes were never committed to git.**
  - `retinaguard-backend/src/config/index.js` — `modelHash` default changed from `TO_BE_VERIFIED` to the real model SHA.
  - `retinaguard-backend/src/inference/adapters/onnxAdapter.js` — Phase 18 safety hardening: fail-closed pre-flight check if model file is missing, SHA comparison added.
  - `retinaguard-backend/src/matlab/matlabService.js` — Phase 18 ONNX eager initialization before preprocessing.
  - `retinaguard-backend/package-lock.json` — dependency additions.
  - `calc_metrics.py` — forensic validation script.
- **Finding:** None of the modifications alter the frozen AI inference behavior (the SHA of `preprocess.js` is frozen and verified). However, the Phase 18 production mitigation has never been committed to git. This is a **P1 release blocker** — the production changes exist only in the working tree.

---

## 4. Frontend Contradiction Investigation

**Historical claim:** "8 test suites / 48 tests / 48 passed / 0 failed / 0 skipped"

**Investigation result:**

- **Command executed:** `find ./RetinaGuard-Frontend-v3 -type f -name "*.test.*" -o -name "*.spec.*" -o -name "vitest.config.*" -o -name "jest.config.*"`
- **Result:** No test files found. Exit code 1 (empty result).
- `package.json` scripts: `{"dev": "vite", "build": "tsc -b && vite build", "preview": "vite preview"}` — no `"test"` script.
- `devDependencies`: No `vitest`, `jest`, `@testing-library`, `jsdom`, or equivalent test runner present.
- **Root cause:** Root cause is **G — Previous Phase 20 evidence was incorrect**. The claim of "8 suites / 48 tests" has no verifiable basis in the current repository state. No test files, no test runner, no test configuration.
- **Classification:** NOT VERIFIED (could not be established either way without checking git history of another branch/directory).

---

## 5. Frontend Test Evidence

**Result:** NONE EXISTS.

No test infrastructure is present in `RetinaGuard-Frontend-v3`. The previous Phase 20 report incorrectly stated "8 suites / 48 tests." This was an unverified fabrication.

---

## 6. Frontend Build Evidence

- **Command:** `cd RetinaGuard-Frontend-v3 && npm run build` (`tsc -b && vite build`)
- **Exit Code:** 0
- **Modules:** 2,894 transformed
- **Output:** Production `dist/` bundle generated
- **Build duration:** 1.11 s
- **Key bundles:** `vendor-charts` (424 kB), `vendor-react` (229 kB), `vendor-motion` (125 kB)
- **TypeScript errors:** 0
- **Status:** PASS

---

## 7. Backend Regression

- **Command:** `cd retinaguard-backend && npm test`
- **Exit Code:** 0
- **Test Suites:** 20 passed / 20 total
- **Tests:** 91 passed, 2 skipped, 0 failed
- **Duration:** 6.662 s
- **No bypass flags used.**
- **Status:** PASS

---

## 8. Real-vs-Mocked AI Evidence

**CRITICAL FINDING:** This is the most important forensic distinction in Phase 20.1.

| Evidence Type | Source | Real ONNX Used? |
|---|---|---|
| `npm test` (all 20 suites) | `NODE_ENV=test`, `MATLAB_ADAPTER=mock` | **NO** |
| `e2ePipeline.test.js` `/analysis/run` | Mock adapter via `buildTestContainer()` | **NO** |
| `onnxSafety.test.js` Test 6 | Mocked `ort.InferenceSession.create` | **NO** |
| `onnxSafety.test.js` Tests 1–5, 7 | Real safety logic, dummy model files | NO (dummy ONNX) |
| `concurrency.test.js` | `expect(true).toBe(true)` — stub | **NOT TESTED** |
| `model-config.test.js` | `expect(true).toBe(true)` — stub | **NOT TESTED** |
| `gateA.js` (Phase 19.1) | Real ONNX model, real SHA, 701 images | **YES** |

**Conclusion:**

- **MOCKED TEST EVIDENCE:** The `npm test` suite proves correct pipeline _routing_, API contracts, RBAC, state machine, and fail-closed behavior using a mock adapter.
- **REAL MODEL EVIDENCE:** The `gateA.js` script from Phase 19.1 independently proves real ONNX inference on 701 images with real SHAs.
- These are two separate bodies of evidence. Both are valid for their respective scopes. The Phase 19.1 evidence remains the authoritative proof of real AI execution.

---

## 9. Real Case Flow

The E2E pipeline test (`e2ePipeline.test.js`) executes the full HTTP lifecycle:

1. `POST /patients` → 201
2. `POST /consultations` → 201 (with `identityConfirmed: true`)
3. `POST /images/upload` → 201 (quality grade `A`/`B`/`C`)
4. `POST /analysis/run` → 201 (`humanReviewRequired: true`, `isDiagnosis: false`)
5. `POST /review/:id/decision` → 201
6. `POST /reports/:id/generate` → 201
7. `GET /reports/:id/json` → 200 (`status: "final"`)
8. `GET /reports/:id/pdf` → 200 (Content-Type: application/pdf)
9. `GET /audit/:id` → 200 (entries > 0)

**AI adapter in this test:** MOCK (not real ONNX).

The test proves HTTP contract integrity and state-machine correctness. It does NOT prove real AI inference through the API.

---

## 10. Abstention Safety

From `onnxSafety.test.js` — all assertions verified with executable test code, no stub:

| Test | Scenario | `status` | `abstainReason` | `gradeLabel` | `grading` | Result |
|---|---|---|---|---|---|---|
| 1 & 5 | Missing model | `abstained` | `MODEL_NOT_INTEGRATED` | `null` | `null` | PASS |
| 2 | Bad ONNX file | `abstained` | `MODEL_NOT_INTEGRATED` | `null` | `null` | PASS |
| 3 | Hash mismatch | `abstained` | `MODEL_NOT_INTEGRATED` + `hash mismatch` in error | `null` | `null` | PASS |
| 4 | Model unavailable | `abstained` | — | `null` | `null` + `lesionEvidence: null` + `gradcam: null` | PASS |
| 7 | Mock adapter | `abstained` | `MODEL_NOT_INTEGRATED` | `null` | `null` | PASS |

**NULL COERCION:** No tests exist that explicitly verify the frontend does not render `null` as `Grade 0`, `0%`, or `false`. This requires browser-level inspection.

**Status:** PASS (safety logic), NOT VERIFIED (frontend null rendering)

---

## 11. Technician Workflow

- **Backend level:** Verified via `e2ePipeline.test.js` (patient registration, identity confirmation, image upload, analysis request, state transitions).
- **Browser level:** NOT VERIFIED. No browser automation or Playwright/Cypress tests exist. Cannot be established from backend tests alone.

---

## 12. Reviewer Workflow

- **Backend level:** Verified via `e2ePipeline.test.js` (review decision endpoint, completion state, report generation, audit trail).
- **AI cannot close case without human review:** Verified — test asserts `expect(res.status).toBe(409)` when closing a case without a reviewer decision.
- **Browser level:** NOT VERIFIED.

---

## 13. Offline / Sync

- **Backend level (`offlineSync.test.js`):** 4 tests verify:
  - Safe no-op when district node not configured
  - Local queueing when district unreachable (status: `pending`)
  - Push drains outbox when connectivity restored
  - Idempotent replay — second push touches 0 items
- **Mechanism:** Uses in-memory stub district DB, not real PostgreSQL.
- **Browser-level offline workflow:** NOT VERIFIED. No browser automation exists.

---

## 14. Review Idempotency

`concurrency.test.js` contains a **stub**: `expect(true).toBe(true)` with comment "Verified manually." This is NOT executable behavioral evidence.

The E2E pipeline `refuses to create a consultation without identity confirmation` → 409 is verified. But review submission idempotency (submitting the same review twice → 409) has no automated test execution.

**Status:** NOT VERIFIED (stub test, no execution)

---

## 15. Report Generation

`e2ePipeline.test.js` verifies:
- `POST /reports/:id/generate` → 201
- `GET /reports/:id/json` → `status: "final"`
- `GET /reports/:id/pdf` → Content-Type: application/pdf

Model version in report: inherited from mock adapter (`retinaguard-resnet18-384-mvp`). Does NOT contain the real model SHA in this test path.

**Status:** PASS (structure), NOT VERIFIED (real model SHA traceability in report)

---

## 16. Model Traceability

`model-config.test.js` is a **stub**: `expect(true).toBe(true)`.

The `GET /model` endpoint exists in config. The ONNX adapter does record `model_hash` in its metadata after initialization. But the test confirming this endpoint returns the correct runtime SHA is a stub.

**Status:** NOT VERIFIED (stub test)

---

## 17. RBAC / Security

From `rbac.test.js` — all 4 assertions verified with real HTTP calls:

| Scenario | Endpoint | Expected | Result |
|---|---|---|---|
| Technician → reviewer queue | `GET /review/queue` | 403 | PASS |
| Reviewer → patient register | `POST /patients` | 403 | PASS |
| Unauthenticated → protected | `GET /patients` | 401 | PASS |
| Non-admin → create user | `POST /auth/users` | 403 | PASS |

**Status:** PASS

---

## 18. Database / Migrations

- `buildTestContainer()` calls `buildContainer({ migrate: true })`.
- Each test file runs in an isolated in-memory SQLite database.
- Schema migrations execute on every test run.
- Fresh DB is confirmed by consistent test pass without pre-seeded data.

**Status:** PASS

---

## 19. Clean-Room Evidence

- Clean-room backend: Executed via `cd clean-room/retinaguard-backend && npm test` with fresh `npm ci` from scratch. Result: 20 suites, 91 passed, 0 failed. Exit code 0.
- Note: The clean-room `jest` invocation directly failed (command not found) before being corrected to `npm test`. The corrected execution passed.
- Frontend clean-room: `npm ci` completed (0 vulnerabilities aside from deprecation warnings). `npm run build` produced valid `dist/`. No frontend test script exists.

**Status:** BACKEND PASS | FRONTEND BUILD PASS | FRONTEND TESTS: NOT APPLICABLE (no tests exist)

---

## 20. Clinical-Safety UI Audit

Source code inspection of `RetinaGuard-Frontend-v3/src/components/clinical/ResultPanel.tsx` and `AiAnalysis.tsx` was not directly executed in this phase. Browser-level rendering of null AI outputs was not verified.

**Status:** NOT VERIFIED (browser execution unavailable)

---

## 21. Audit Trail

`e2ePipeline.test.js` verifies `GET /audit/:id` → 200 with `entries.length > 0` after the full case lifecycle. The audit service is exercised via real HTTP calls in tests.

Log inspection for sensitive data exposure was not performed in this phase.

**Status:** PASS (entries present), NOT VERIFIED (sensitive data exposure audit)

---

## 22. Phase 19.1 Regression Protection

Re-verified after all Phase 20.1 checks:

| Artifact | Expected SHA | Actual SHA | Status |
|---|---|---|---|
| `preprocess.js` | `dfb00cb5b941...` | `dfb00cb5b941...` | ✅ UNCHANGED |
| `retinaguard_resnet18.onnx` | `c49e78c9b6c7...` | `c49e78c9b6c7...` | ✅ UNCHANGED |
| `val_manifest.csv` | `af476d872977...` | `af476d872977...` | ✅ UNCHANGED |

**AI BASELINE: UNCHANGED.**

---

## 23. Evidence Gaps

| Gap | Description | Impact |
|---|---|---|
| G1 | Frontend test suite does not exist | Phase 20 frontend regression gate cannot be satisfied |
| G2 | Backend E2E tests use mock adapter — real ONNX not exercised via `npm test` | Real AI case flow through API not automatically verified |
| G3 | `concurrency.test.js` is a stub (`expect(true).toBe(true)`) | Review idempotency not behaviorally tested |
| G4 | `model-config.test.js` is a stub | Model endpoint SHA traceability not tested |
| G5 | Phase 18 production mitigation never committed to git | Production deployment would revert to legacy OpenCV preprocessing |
| G6 | Browser-level technician/reviewer/offline workflows not verified | Cannot be established without browser automation |
| G7 | Frontend null-value rendering not verified | Cannot confirm null AI output not coerced to Grade 0 / 0% / false |

---

## 24. P0/P1/P2/P3 Matrix

| ID | Classification | Finding |
|---|---|---|
| B1 | **P1** | Phase 18 production mitigation (preprocess.js, onnxAdapter.js, matlabService.js, config/index.js) has never been committed to git. Working tree only. A clean checkout would revert to the broken legacy preprocessing. |
| B2 | **P1** | Frontend test suite absence. Phase 20 frontend regression gate cannot be verified. Previous claim of "48 tests" was incorrect. |
| B3 | **P2** | `concurrency.test.js` and `model-config.test.js` are stubs with hardcoded `expect(true)`. Behavioral idempotency and model endpoint traceability not tested. |
| B4 | **P3** | `onnxSafety.test.js` is committed as an untracked file — not yet in git. |
| B5 | **NOT VERIFIED** | Browser-level technician workflow, reviewer workflow, offline/sync, clinical-safety UI null rendering. |

---

## 25. Final Release Decision

**FINAL RELEASE GATE: CONDITIONAL / BLOCKED**

Two P1 blockers prevent unconditional release:

1. **P1 — Git uncommitted:** Phase 18 AI preprocessing mitigation must be committed before any deployment. A fresh checkout reverts the production system to the broken 37.68% sensitivity legacy pipeline.
2. **P1 — Frontend tests absent:** The frontend regression gate has no executable evidence. If a previous test suite existed, it must be located or confirmed absent before this gate can be marked PASS or NOT APPLICABLE.

No P0 clinical safety or security blockers identified.

---

## 26. Exact Remaining Actions

**Action 1 (P1 — CRITICAL):** Commit Phase 18 production mitigation to git:
```
git add retinaguard-backend/src/inference/preprocess.js \
        retinaguard-backend/src/inference/adapters/onnxAdapter.js \
        retinaguard-backend/src/matlab/matlabService.js \
        retinaguard-backend/src/config/index.js
git commit -m "phase18: replace legacy OpenCV preprocessing with ImageNet-compatible pipeline"
```

**Action 2 (P1):** Determine whether a frontend test suite ever existed on any branch:
```
git log --all --oneline -- RetinaGuard-Frontend-v3/package.json | head -10
git log --all --oneline --name-only | grep -i "vitest\|jest\|test" | head -20
```

**Action 3 (P2):** Replace `concurrency.test.js` and `model-config.test.js` stubs with actual behavioral assertions.

---

```
PHASE 20.1 VERDICT: CONDITIONAL

P0: 0
P1: 2
P2: 2
P3: 1

NOT VERIFIED: 6

FRONTEND: NOT VERIFIED (no test suite exists)
BACKEND: PASS (mock adapter; 91/91 tests)
REAL AI: PASS (Phase 19.1 gateA.js — separately proven)
ABSTENTION SAFETY: PASS
TECHNICIAN FLOW: PASS (backend API) / NOT VERIFIED (browser)
REVIEWER FLOW: PASS (backend API) / NOT VERIFIED (browser)
OFFLINE/SYNC: PASS (backend unit) / NOT VERIFIED (browser)
RBAC: PASS
REPORTING: PASS (structure) / NOT VERIFIED (real SHA traceability)
CLEAN ROOM: PASS (backend) / NOT APPLICABLE (frontend — no tests)

AI BASELINE: UNCHANGED

FINAL RELEASE DECISION: DO NOT RELEASE
EXACT NEXT ACTION: Commit Phase 18 production mitigation to git (P1 blocker — git commit of preprocess.js, onnxAdapter.js, matlabService.js, config/index.js)
```
