# Audit Methodology (v7.1)

The auditor employed the following methodology to verify the v7.0 claims:

1. **Immutable State Capture:** Initial read-only git queries were executed to prove no source files were mutated.
2. **Artifact Tracing:** Each "PASS" in the executor's matrix was mapped to a required execution artifact or log block.
3. **Reproducibility Test:** For critical quantitative claims (such as Dataset Fingerprint, Model Hash, and Python/Node Parity 99.71% agreement), the auditor executed independent, read-only Python scripts that recomputed the hashes and parity percentages directly from the raw `G8_NODE_701` and `G9_PYTHON_701` JSON files.
4. **Mock vs. Runtime Differentiation:** The auditor inspected the testing harnesses used for the API and Lifecycle validations. Recognizing the presence of `Supertest` alongside in-memory database configuration, the auditor downgraded claims from "PASS" to "NOT VERIFIED" where they conflated test-harness validation with full runtime deployment behavior.
5. **G31 Audit Recursion:** The executor's G31 script was opened and directly analyzed. It was rejected because it only performed surface-level existence checks rather than comprehensive gate logic verification.
