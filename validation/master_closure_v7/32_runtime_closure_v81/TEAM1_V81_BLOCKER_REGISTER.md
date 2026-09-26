# TEAM 1 V8.1 BLOCKER REGISTER

## B-A
**DESCRIPTION**: REAL ML RUNTIME
**OWNER**: Team 1
**ENVIRONMENT**: Backend / Inference
**REPRODUCTION**: The configured model artifact (`retinaguard_resnet18.onnx`) is physically missing from the repository (`model/` directory) and there are no scripts to download or generate it.
**IMPACTED GATES**: G12, G13, G14, G15, G16, G17, G18, G19, G20, G21, G22, G23, G24
**RESOLUTION**: Unresolved.
**EVIDENCE**: `Get-ChildItem -Filter *.onnx -Recurse` returns empty. The `model/RetinaGuard_ML` folder does not contain the artifact.
**STATUS**: BLOCKED

## B-B
**DESCRIPTION**: OFFLINE NETWORK ISOLATION
**OWNER**: Team 1
**ENVIRONMENT**: Backend API
**REPRODUCTION**: Previously, severing the network connection in the headless browser crashed Vite and the CDP control connection. 
**IMPACTED GATES**: G16, G17
**RESOLUTION**: Added a test-only middleware to the backend Express server (`/api/v1/offline-toggle`) that allows controlled API refusal (503 Service Unavailable or dropped sockets) without affecting the Vite dev server or the CDP connection.
**EVIDENCE**: Changes merged into `src/app.js`.
**STATUS**: RESOLVED (Mechanism available, though test execution is blocked by B-A)

## B-C
**DESCRIPTION**: CLEAN ROOM / better-sqlite3
**OWNER**: Team 1
**ENVIRONMENT**: Windows / Node v24.14.0
**REPRODUCTION**: `npm install` fails in a clean room because `better-sqlite3` lacks prebuilt binaries for Node v24 on Windows, and the node-gyp Visual Studio fallback hits an `EPERM` error. 
**IMPACTED GATES**: G28
**RESOLUTION**: Unresolved. The required Node version in `package.json` is `>=22.0.0`, but the only available Node version on this host is `24.14.0`. `nvm` is not installed, preventing an environment downgrade.
**EVIDENCE**: `where.exe node` confirms only v24 is available. 
**STATUS**: BLOCKED

## B-D
**DESCRIPTION**: SECURITY HUMAN ACTION
**OWNER**: Administration
**ENVIRONMENT**: GitHub / Auth
**REPRODUCTION**: Historical PAT exposed in prior commits.
**IMPACTED GATES**: Security
**RESOLUTION**: Unresolved. Requires manual human intervention to rotate secrets.
**EVIDENCE**: N/A
**STATUS**: HUMAN ACTION REQUIRED
