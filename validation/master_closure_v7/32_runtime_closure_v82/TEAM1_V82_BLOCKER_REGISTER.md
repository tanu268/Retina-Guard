# TEAM 1 V8.2 BLOCKER REGISTER

## B-A
**DESCRIPTION**: REAL ML RUNTIME
**OWNER**: Team 1
**ENVIRONMENT**: Backend / Inference
**REPRODUCTION**: The configured model artifact (`retinaguard_resnet18.onnx`) was historically missing.
**AFFECTED GATES**: G04, G05
**DEPENDENCY CLASS**: MODEL_DEPENDENT
**CURRENT EVIDENCE**: A candidate model artifact was externally supplied, its hash (`c49e78c9...`) matched expectations, and it was successfully loaded and executed using the `onnxruntime-node` backend adapter (`test_onnx.js` verification).
**ATTEMPTED FIXES**: Copied artifact to `model/retinaguard_resnet18.onnx`. Configured `.env` to `MATLAB_ADAPTER=onnx`. 
**RESULT**: PARTIALLY RESOLVED. The model execution succeeds in isolation, but the end-to-end API inference flow is blocked by B-C (API server cannot start).
**REMAINING ACTION**: Resolve B-C to allow the API server to consume the model result.
**SEVERITY**: CRITICAL

## B-C
**DESCRIPTION**: CLEAN ROOM / better-sqlite3
**OWNER**: Team 1
**ENVIRONMENT**: Windows / Node v24.14.0
**REPRODUCTION**: `npm ci` fails because `better-sqlite3` lacks prebuilt binaries for Node v24 on Windows, and the node-gyp Visual Studio fallback hits an `EPERM` error when attempting to find the VS compiler.
**AFFECTED GATES**: G06, G07, G08, G09, G10, G11, G12, G13, G14, G15, G16, G17, G18, G19, G20, G21, G22, G23, G24, G25, G26
**DEPENDENCY CLASS**: MODEL_INDEPENDENT
**CURRENT EVIDENCE**: `npm ci` log shows `prebuild-install warn install No prebuilt binaries found (target=24.14.0...)` and `spawn EPERM`. Running `node src/server.js` throws `Could not locate the bindings file`.
**ATTEMPTED FIXES**: Ran `npm install --ignore-scripts` to restore other dependencies.
**RESULT**: UNRESOLVED. The API server cannot start without SQLite native bindings.
**REMAINING ACTION**: Downgrade host to Node v22.x or install Visual Studio Build Tools.
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
