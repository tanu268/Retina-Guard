# TEAM 1 V8.4 FORENSIC RECONCILIATION

## Execution History
- **V7.0-V7.1**: Initial forensic protocols highlighted the disconnect between tests and reality.
- **V7.2 / V8.1**: Team 1 discovered that `better-sqlite3` and `onnxruntime-node` were not actually executing in the backend API context. The model file was missing.
- **V8.2**: The true ONNX model was supplied and independently verified via a standalone script, but `npm ci` failed under Node v24.14.0 due to missing `better-sqlite3` native binaries.
- **V8.3**: Attempted to migrate to Node v22.14.0. The pre-built binaries were downloaded, and the backend booted successfully, but the documentation generation left some gaps in strict evidence formatting.
- **V8.4 (Current)**: The V8.3 progress is codified into strict, independent evidence structures. The test dependencies were freshly clean-room verified without cache contamination.

## Reconciled Status
1. **Model Execution (G04, G05)**: Restored to `PASS`. Real HTTP -> ONNX -> SQLite trace is firmly established.
2. **Runtime Boot (G06)**: Restored to `PASS`. Native bindings verified under Node v22.
3. **Frontend E2E (G14, G15)**: `NOT_VERIFIED` in V8.4 scope. Relies on Team 2 to execute their tests against the new, working V8.4 backend configuration.
4. **Offline Sync (G16)**: `NOT_VERIFIED` in V8.4 scope (Frontend IndexedDB domain).
5. **Security (G28/PAT)**: `HUMAN ACTION REQUIRED`. Code remediation is verified (scrubbed), but active tokens must be rotated manually.

## Contradictions Resolved
- Prior "PASS" for `e2ePipeline.test.js` was falsely attributed to the `onnx` adapter. `run_v84_api_tests.js` was built to strictly enforce `MATLAB_ADAPTER=onnx` during tests against a truly running external backend daemon process. This eliminated the mock-contamination contradiction.
