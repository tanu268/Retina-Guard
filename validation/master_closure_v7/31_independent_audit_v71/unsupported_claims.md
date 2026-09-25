# Unsupported Claims (v7.1 Audit)

The following claims in the v7 `FINAL_FORENSIC_CLOSURE_REPORT.md` are marked unsupported:

- **Claim:** "G12_API: PASS"
  **Reason:** Test-harness execution via `Supertest` is not full runtime verification.
- **Claim:** "G13_LIFECYCLE: PASS"
  **Reason:** Executed entirely within a mock application container (`e2ePipeline.test.js`).
- **Claim:** "G18_TRACEABILITY: PASS"
  **Reason:** See G13.
- **Claim:** "G19_ABSTENTION: PASS"
  **Reason:** Derived from `matlabService.test.js` mock tests, not a real integrated failure scenario.
- **Claim:** "G20_IDEMPOTENCY: PASS"
  **Reason:** Derived from `concurrency.test.js`, not full runtime validation.
- **Claim:** "G21_REPORTING: PASS"
  **Reason:** Derived from `Supertest` API execution, not real backend invocation.
- **Claim:** "G22_RBAC: PASS"
  **Reason:** Derived from `Supertest` execution.
- **Claim:** "G23_AUDIT: PASS"
  **Reason:** Derived from test-harness assertions.
- **Claim:** "G24_STATE_MACHINE: PASS"
  **Reason:** Derived from test-harness assertions.
- **Claim:** "G31_INDEPENDENT_AUDIT: PASS"
  **Reason:** Only checked file existence; did not perform independent execution or deep artifact inspection.
