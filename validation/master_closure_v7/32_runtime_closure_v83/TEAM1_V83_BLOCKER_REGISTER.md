# TEAM 1 V8.3 BLOCKER REGISTER

## B-A
**DESCRIPTION**: REAL ML RUNTIME
**OWNER**: Team 1
**ENVIRONMENT**: Backend / Inference
**REPRODUCTION**: The configured model artifact (`retinaguard_resnet18.onnx`) was historically missing.
**AFFECTED GATES**: G04, G05, G12
**DEPENDENCY CLASS**: MODEL_DEPENDENT
**CURRENT EVIDENCE**: A candidate model artifact was externally supplied, its hash (`c49e78c9...`) matched expectations, and it was successfully loaded and executed using the `onnxruntime-node` backend adapter (`test_onnx.js` verification). In V8.3, the model was executed via the real API (`run_v83_api_tests.js`).
**ATTEMPTED FIXES**: Configured `.env` to `MATLAB_ADAPTER=onnx` and `MODEL_VERSION=retinaguard_resnet18.onnx`.
**RESULT**: RESOLVED. The real API server successfully consumes the ONNX inference output and persists the analysis state.
**REMAINING ACTION**: None.
**SEVERITY**: CRITICAL

## B-C
**DESCRIPTION**: CLEAN ROOM / better-sqlite3
**OWNER**: Team 1
**ENVIRONMENT**: Windows / Node v22.14.0
**REPRODUCTION**: `npm ci` failed in V8.2 because `better-sqlite3` lacked prebuilt binaries for Node v24.
**AFFECTED GATES**: G06-G26
**DEPENDENCY CLASS**: MODEL_INDEPENDENT
**CURRENT EVIDENCE**: Node `v22.14.0` was downloaded and established as the execution path. `npm ci` completed successfully utilizing pre-built `better-sqlite3` bindings. Server initialized.
**ATTEMPTED FIXES**: Downgraded execution environment to Node `v22.14.0`.
**RESULT**: RESOLVED. The backend starts successfully and tests run without database access errors.
**REMAINING ACTION**: None.
**SEVERITY**: CRITICAL

## B-D
**DESCRIPTION**: SECURITY HUMAN ACTION
**OWNER**: Administration
**ENVIRONMENT**: GitHub / Auth
**REPRODUCTION**: Historical PAT exposed in prior commits.
**AFFECTED GATES**: G28
**DEPENDENCY CLASS**: MODEL_INDEPENDENT
**CURRENT EVIDENCE**: N/A
**ATTEMPTED FIXES**: None. Automated run cannot fulfill manual security tasks.
**RESULT**: UNRESOLVED.
**REMAINING ACTION**: Manual revocation of PATs.
**SEVERITY**: HIGH
