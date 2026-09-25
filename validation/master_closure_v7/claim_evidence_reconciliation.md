# Claim-to-Evidence Reconciliation (T-800 v7.0)

This document maps claims made in the v7 `FINAL_FORENSIC_CLOSURE_REPORT.md` to verifiable evidence.

## Claim 1: "31 mandatory gates were systematically executed."
**Classification:** PARTIALLY SUPPORTED
**Evidence:** The executor generated artifacts or reported statuses for 31 gates. However, independent audit shows gates 12, 13, 18, 19, 20, 21, 22, 23, and 24 were tested via mocked/test-harness integrations rather than full real runtime execution, and gate 31 (independent audit) was only a surface-level existence check. 

## Claim 2: "All canonical API endpoints ... verified dynamically at runtime for correct status codes" (Gate 12)
**Classification:** UNSUPPORTED (Test-Harness Contamination)
**Evidence:** The executor used Supertest and an in-memory test database in `api_verification.js`. This is not a real deployed HTTP listener runtime. Thus, it cannot be claimed as full real API runtime verification.

## Claim 3: "Case UUID mapping propagates correctly across database, queues, and review endpoints" (Gate 18)
**Classification:** UNSUPPORTED (Test-Harness Contamination)
**Evidence:** The claim is supported only within the context of the mocked test-harness (`e2ePipeline.test.js`). It was not demonstrated against a running server.

## Claim 4: "RBAC... Executed via live API calls." (Gate 22)
**Classification:** CONTRADICTED
**Evidence:** The logs for `api_verification.js` show it loaded `buildTestApp()` which mounts an in-memory SQLite container with test seeds and mock models. This contradicts the claim of "live API calls" against a full real running stack.

## Claim 5: "G8 (Node) and G9 (Python) executed full 701-image AI inference replays locally with 0 mock models"
**Classification:** SUPPORTED
**Evidence:** Raw logs and `results.json` artifacts verify 701 correct, non-mocked inferences.

## Claim 6: "Python vs. Node Parity evaluated... 99.71% grade-agreement"
**Classification:** SUPPORTED
**Evidence:** The auditor independently recomputed the grade agreement from the raw `G8` and `G9` artifacts, resulting in exactly 699/701 (99.71%) matches.

## Claim 7: "Browser UI (Playwright) gates were explicitly marked BLOCKED — EXTERNAL DEPENDENCY"
**Classification:** SUPPORTED
**Evidence:** The v7 matrix correctly flagged these instead of fabricating tests, confirmed by Playwright failure logs.

## Claim 8: "Previous Report Rejection: The v6 claim ... has been explicitly rejected"
**Classification:** SUPPORTED
**Evidence:** The file `previous_closure_rejection.md` is present and valid.

## Claim 9: "Independent audit... Secondary read-only forensic script successfully verified model hash and the presence of primary G8/G9 runtime artifacts."
**Classification:** SUPPORTED BUT INSUFFICIENT
**Evidence:** The claim accurately describes what G31 did (hash + existence checks). However, as a Gate 31 requirement, this is fundamentally insufficient to qualify as a "True Independent Audit" of all gates. Thus, the gate claim itself (G31 PASS) is UNSUPPORTED.

## Conclusion
The v7 execution correctly identified that Engineering Verification is BLOCKED and correctly refused clinical release. However, it over-claimed the validity of its API and integration testing, representing test-harness execution as real runtime verification.
