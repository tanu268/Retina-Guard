# GATE 0A — IMMUTABLE FORENSIC BASELINE

**Captured:** 2026-09-25T23:30 IST (BEFORE any source modification in v7.0 session)

## BASELINE_COMMIT
22c25e838dc52536aaf0ffcce5fd5f1bdbf8540d

## BASELINE_BRANCH
main

## BASELINE_STATUS (modified vs HEAD)
- M ENGINEER1_MASTER_T800_FINAL_REMEDIATION_AND_RELEASE_REPORT.md
- M retinaguard-backend/src/modules/cases/cases.controller.js
- M retinaguard-backend/tests/integration/parser.test.js
- M retinaguard-backend/tests/unit/matlabService.test.js
- ?? (many untracked validation artifacts, scripts, data files)

**NOTE:** The 4 modified files represent changes from v6 session that were NOT committed.  
They are changes to: a markdown report (PAT redaction), one prod file (parseJSONSafe export), two test files (skip removals/fixes).

## FROZEN ARTIFACT HASHES (independently verified at baseline capture)

| Artifact | SHA-256 | Matches Frozen? |
|---|---|---|
| retinaguard_resnet18.onnx | c49e78c9b6c7bfa5b0098bd40a3901d02c7b41c9598cac993891b29263476f3f | YES |
| src/inference/preprocess.js | dfb00cb5b941e7a266b4f64ea75769080930971cc549b6d6ee9c4e72420e5f05 | YES |
| model/RetinaGuard_ML/processed/val_manifest.csv | af476d872977a53e44438fca6fd397d4c8f98b08a3c96259e950dd5794ec428c | YES |

## BASELINE_DIFF SUMMARY

Four files differ from HEAD `22c25e8`:

1. **ENGINEER1_MASTER_T800_FINAL_REMEDIATION_AND_RELEASE_REPORT.md** — PAT value replaced with `ghp_REDACTED` (security redaction, no production code impact)
2. **retinaguard-backend/src/modules/cases/cases.controller.js** — Added `buildCasesController.parseJSONSafe = parseJSONSafe;` export (allows unit testing, no production behavior change)
3. **retinaguard-backend/tests/integration/parser.test.js** — Placeholder `expect(true)` replaced with real assertions for `parseJSONSafe`
4. **retinaguard-backend/tests/unit/matlabService.test.js** — Removed `.skip` from two tests; assertions updated to verify mock backstop errors

## RECENT COMMITS (last 20)
- 22c25e8 fix: T-800 v4.0 Final Defect Remediation and Closure  ← HEAD
- c2f6a78 chore: V3 Master Remediation Closure
- 2b77bde test: unstub concurrency and model-config integration tests
- 4b29121 phase18: replace legacy OpenCV preprocessing with ImageNet-compatible pipeline
- ffa1907 Rebrand from RetinaGuard to UVI and update logo sizes
- ...
