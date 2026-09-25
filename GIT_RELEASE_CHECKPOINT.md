# GIT_RELEASE_CHECKPOINT

## Repository
- Repository: Retina-Guard
- Remote: origin
- Branch: main
- Previous HEAD: 2b18873
- Upstream branch: origin/main

## Checkpoint Purpose
This commit freezes the current ONNX-integrated and validation-tested engineering state before further performance remediation.

## Included
- Source-code changes for ONNX integration (backend/frontend)
- Scripts for independent Python-vs-Node parity verification
- Determinism test scripts and ONNX E2E regression scripts
- Validation reporting and Markdown evidence artifacts
- Current metric scripts and `.gitignore` updates

## Excluded
- `model/retinaguard_resnet18.onnx` (and all other .onnx files locally excluded due to missing Git LFS configuration and size)
- `local_dataset/`
- `.env` and `.venv`
- `node_modules`
- Python cache, generated temporary outputs, OS metadata, sqlite DB files
- SQLite logs

## Model
Model: retinaguard_resnet18.onnx
SHA-256: c49e78c9b6c7bfa5b0098bd40a3901d02c7b41c9598cac993891b29263476f3f

## Regression
Command: npm test
Exit code: 0
Suites: 19
Tests: 87
Passed: 85
Failed: 0
Skipped: 2

## Validation
The 701-image labeled validation evaluation was successfully completed (0 failures) and documented. 

## Known Limitations
> The current model demonstrates substantial under-calling of referable diabetic retinopathy on the evaluated 701-image cohort and requires performance remediation before production/clinical readiness.

## Checkpoint Status
ENGINEERING CHECKPOINT — CURRENT VALIDATED STATE
