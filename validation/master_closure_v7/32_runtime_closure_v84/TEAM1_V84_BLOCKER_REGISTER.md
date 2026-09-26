# TEAM 1 V8.4 BLOCKER REGISTER

## B-A
**DESCRIPTION**: REAL ML RUNTIME
**OWNER**: Team 1
**SEVERITY**: CRITICAL
**AFFECTED GATES**: G04, G05, G12
**ROOT CAUSE**: Historical absence of actual model artifact in testing.
**EVIDENCE**: See `TEAM1_V84_MODEL_EXECUTION_TRACE.md`.
**REPRODUCTION**: Run API, hit `/analysis/run`, observe ONNX integration logs.
**REMEDIATION**: Supplied artifact; integrated via `onnxruntime-node`.
**CURRENT STATE**: RESOLVED.
**NEXT ACTION**: None.
**HUMAN ACTION**: No.

## B-C
**DESCRIPTION**: CLEAN ROOM / better-sqlite3 NATIVE COMPILATION
**OWNER**: Team 1
**SEVERITY**: CRITICAL
**AFFECTED GATES**: G06-G26
**ROOT CAUSE**: Node v24.14.0 lack of pre-compiled `better-sqlite3` bindings.
**EVIDENCE**: See `TEAM1_V84_CLEAN_ROOM_REPORT.md`.
**REPRODUCTION**: `npm ci` under Node v24.
**REMEDIATION**: Explictly transitioned runtime to Node v22.14.0 where ABI 127 binaries exist remotely.
**CURRENT STATE**: RESOLVED.
**NEXT ACTION**: None.
**HUMAN ACTION**: No.

## B-D
**DESCRIPTION**: EXPOSED SECURITY SECRETS
**OWNER**: Admin
**SEVERITY**: HIGH
**AFFECTED GATES**: G28
**ROOT CAUSE**: Hardcoded PAT in historical git commit logs (before v7.2).
**EVIDENCE**: `git log` review (already scrubbed in `c63da123077c22612cdbfffe4f075da8f7b6cc12`).
**REPRODUCTION**: Review historical commits.
**REMEDIATION**: Code has been scrubbed, but actual remote GitHub revocation needs manual intervention by owner.
**CURRENT STATE**: UNRESOLVED.
**NEXT ACTION**: Manual revocation of PATs.
**HUMAN ACTION**: REQUIRED.
