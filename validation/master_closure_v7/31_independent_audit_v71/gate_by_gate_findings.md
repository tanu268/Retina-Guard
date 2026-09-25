# Gate-by-Gate Findings (v7.1 Audit)

The following summarizes the core discrepancies and affirmations from the independent audit vs the executor claims. A full matrix is in `independent_gate_matrix.json`.

- **Gates 0-11, 25-27, 29, 30:** SUPPORTED. The executor properly executed baseline freezes, model verification, single inference, 701-image replay in both Python and Node, test integrity checks, and regression passes. The dataset fingerprints and parity metrics were independently recalculated and proven accurate.
- **Gates 14-17:** SUPPORTED (as BLOCKED). The executor correctly flagged the Playwright browser endpoints as BLOCKED due to external OS dependencies rather than fabricating a PASS.
- **Gate 28:** SUPPORTED (as NOT VERIFIED). The executor correctly stated that physical clean-room execution was impossible without OS wipe powers.
- **Gates 12, 13, 18-24 (API and Integrations):** UNSUPPORTED (Downgraded to NOT VERIFIED). The executor marked these as "PASS" while testing them through `api_verification.js` and `e2ePipeline.test.js`. These testing harnesses use `Supertest` and mount the application using an in-memory test database and mock models. This is NOT real full runtime integration testing, and the executor failed to distinguish between a test-harness PASS and a real-runtime PASS.
- **Gate 31 (Independent Audit):** UNSUPPORTED (Downgraded to FAIL). The previous G31 executor script only checked model hashes and the existence of provenance files without auditing any actual gate execution logic. It was not a true independent audit.
