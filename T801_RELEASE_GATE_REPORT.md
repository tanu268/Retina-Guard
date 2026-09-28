# T-801 / T-802 RELEASE GATE REPORT

## 1. Executive Result

BLOCKED — REQUIRED GATES REMAIN NOT VERIFIED OR FAIL

## 2. Repository Baseline
- **HEAD:** `d897b44` (feat(T-800): real Grad-CAM pipeline)
- **Branch:** `main`
- **Node:** `v20.20.2`
- **Python:** `Python 3.12.3`
- **ONNXRuntime:** `1.30.0`

## 3. Model Provenance
- **Configured Model Hash:** `c49e78c9b6c7bfa5b0098bd40a3901d02c7b41c9598cac993891b29263476f3f`
- **Actual Model Hash:** `c49e78c9b6c7bfa5b0098bd40a3901d02c7b41c9598cac993891b29263476f3f`
- **Shape:** `[0, 3, 384, 384]`
- **Target Layer:** `/backbone/layer4/layer4.1/relu_1/Relu_output_0` exists in ONNX graph
- **FC Weights Shape:** `(5, 512)`

## 4. Real Inference Evidence
Real Python execution verified via `retinaguard_gradcam.py`.
- ONNX successfully taps `/backbone/layer4/layer4.1/relu_1/Relu_output_0`.
- Peak intensities and regions correctly extracted from raw array operations.

## 5. Grad-CAM Evidence
- E2E API response confirms payload with regions: `[{ "x": 0.25, "y": 0.083, "w": 0.666, "h": 0.916, "intensity": 1 }]`
- Artifact correctly persisted to `uploads/gradcam/<analysis_uuid>.png`.

## 6. API Integration
- `onnxAdapter.js` spawns Python process cleanly.
- `analysisService.js` correctly maps `explainability` payloads for gradcam even on LOW_CONFIDENCE abstentions.
- The `identity_confirmed` bug in cases controller was resolved.
- **T-802 Update:** API no longer exposes absolute filesystem paths. `artifact_path` is correctly stored and served as a relative path (`gradcam/<uuid>.png`).

## 7. Frontend E2E
Code verification only (Playwright/Browser automation unavailable):
- `RetinaViewer.tsx` correctly extracts `gradcamRegions` from props.
- Schematic rendering draws the regions using SVG boundaries.
- API service fetches `/analysis/:id/explainability`.

## 8. Reviewer E2E
- Verified Review queue (status 200).
- Verified Reviewer case detail (status 200 via `consultation_id`).
- Submitted idempotent reviewer decisions successfully.
- Correctly restricts reviewer endpoints to authorized roles.

## 9. Report Integrity
- Generated report JSON contains `analysis_id`.
- Gradcam path present in report payload when explainability is requested.
- Review decision mapped to report correctly.

## 10. Failure Matrix
- **Missing model:** Safe downgrade to `LOW_CONFIDENCE`, no Grad-CAM returned, pipeline unharmed.
- **Python Grad-CAM crash:** Safe downgrade, timeline logged, pipeline unharmed.
- **Duplicate review:** Handled idempotently (409 CONFLICT).
- **Invalid upload:** Handled gracefully (415 UNSUPPORTED_MEDIA_TYPE).
- **Missing laterality:** Handled safely.

## 11. Offline Validation
- 0 HTTP/external calls detected in inference logic. 
- Inference uses purely local `CPUExecutionProvider` via `onnxruntime`.

## 12. Regression Results
- **Original finding:** Ambiguous test count (21 suites, 97 tests PASS vs 97/99).
- **Remediation:** Executed `jest --runInBand --passWithNoTests` to resolve counts.
- **New evidence:** 
  - Test suites: 21 total, 21 passed.
  - Tests: 99 total, 97 passed, 0 failed, 2 skipped.
  - Re-run after T-802 fixes: PASS.
- **Final gate status:** G17 = PASS.

## 13. Security Audit
- **Original finding:** `ghp_` PAT was embedded in the Git `origin` remote URL, and API exposed absolute filesystem paths.
- **Remediation:** 
  - Token removed from active git remote.
  - Absolute paths fixed in `analysisService.js` (relative path stored in database).
  - Terminology updated in `Landing.tsx` ("lesion localization" -> "AI attention visualization").
- **New evidence:**
  - `git log` confirms the token (`ghp_REDACTED_TOKEN_SEE_GITHUB_SECURITY`) exists in git history.
  - API regression tests explicitly verify no absolute paths are returned.
- **Final gate status:** G18 = FAIL (historical token exposure requires human revocation), Artifact-path integration = PASS.

## 14. Performance
- **Grad-CAM cold start average:** 775.0 ms
- **Total E2E Pipeline:** ~1444 ms

## 15. Determinism
Two consecutive runs on the exact same input produced:
- Byte-identical output PNGs.
- Identical `cam_max`.
- Identical regions.

## 16. 20-Gate Matrix

| Gate | Status | Evidence |
|------|--------|----------|
| G01 | PASS | Git baseline verified |
| G02 | PASS | Hash matches |
| G03 | PASS | ONNX graph inspected |
| G04 | PASS | Python execution verified |
| G05 | PASS | FC weights extracted |
| G06 | PASS | Regions calculated |
| G07 | PASS | Border flags included |
| G08 | PASS | Artifact ID matched |
| G09 | PASS | API payload verified |
| G10 | NOT VERIFIED | Browser E2E agent failed to load frontend / 503 error |
| G11 | PASS | Report JSON verified |
| G12 | PASS | Reviewer API E2E passed |
| G13 | PASS | Missing model degraded safely |
| G14 | PASS | Grad-CAM crash degraded safely |
| G15 | NOT VERIFIED | Current ONNX adapter hardcodes qualityGrade='A', unable to physically execute rejection path |
| G16 | PASS | No HTTP dependencies in inference |
| G17 | PASS | 99 total, 97 passed, 2 skipped |
| G18 | FAIL | Credential found in git history, requires manual revocation |
| G19 | PASS | Byte-identical outputs |
| G20 | PASS | Artifacts captured |
| Artifact-path | PASS | Absolute paths removed from API payloads |

## 17. Blocking Issues
1. **Security:** Token rotation required for `ghp_REDACTED_TOKEN_SEE_GITHUB_SECURITY`. The token is in the git repository history and requires human intervention to revoke in GitHub Developer Settings.
2. **Frontend E2E (G10):** NOT VERIFIED. Browser automation failed.
3. **Quality Rejection (G15):** NOT VERIFIED. Current ONNX adapter always returns passing quality, so the bad-quality rejection path cannot be exercised.

## 18. Files Changed (T-802)
- `retinaguard-backend/src/services/analysisService.js` (Fixed artifact path exposure)
- `retinaguard-backend/tests/unit/analysisService.test.js` (Added artifact path regression tests)
- `RetinaGuard-Frontend-v3/src/pages/landing/Landing.tsx` (Terminology fix)
- `T801_RELEASE_GATE_REPORT.md` (Updated report, redacted secrets)

## 19. Commands Executed
- `jest` test suite
- `grep` security audit
- `curl` / `requests` E2E test scripts
- `browser_subagent` (failed)

## 20. Final Release Recommendation
BLOCKED

The backend is stable and no longer leaks paths, but the release cannot proceed. Required gates remain NOT VERIFIED (G10, G15) and FAIL (G18 - historical credential exposure). No optimistic language: the system is NOT production-ready until these blockers are resolved.
