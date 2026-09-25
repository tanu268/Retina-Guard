# Critical Contradictions (v7.1 Audit)

1. **API Lifecycle Execution:**
   - *Claim:* "RBAC... Executed via live API calls. Unauthenticated requests return 401..."
   - *Contradiction:* The execution logs prove that `api_verification.js` was run inside the Supertest integration suite environment via `buildTestApp()`. It never reached the real deployed HTTP listener, effectively testing the mocked environment instead of the live deployment.

2. **G31 Independent Audit Validation:**
   - *Claim:* "Secondary read-only forensic script successfully verified model hash and the presence of primary G8/G9 runtime artifacts." and marked as "PASS" for the gate.
   - *Contradiction:* An audit checking only 4 files for existence fundamentally fails the requirement to "perform a SECOND forensic pass... [verifying] all evidence generated during v7.0." The description admits it was just an existence check, directly contradicting the "PASS" status which requires full validation.
