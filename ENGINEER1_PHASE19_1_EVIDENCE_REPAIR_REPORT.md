# ENGINEER1 — T-800 PHASE 19.1 EVIDENCE REPAIR REPORT
**Project:** RetinaGuard
**Date:** 2026-09-25
**Phase:** T-800 Evidence Integrity Re-run

---

## 1. Previous Evidence Defects
Forensic review of the Phase 19 validation identified three methodological flaws:
1. The Node inference script passed `sha256: 'mock'` instead of computing and passing the actual physical file hash.
2. The image integrity verifier bypassed independent decoding and assumed `PASS` based on file size and hash.
3. The baseline backend test was invoked with bypass arguments (`|| true` / `--passWithNoTests`).

## 2. Exact Corrective Action
All flawed test harnesses were rewritten and executed to enforce absolute cryptographic and programmatic integrity without mutating any production code. `sha256: 'mock'` was entirely purged from the validation scripts, and raw images were actively loaded into memory via `PIL` to verify their structural integrity.

## 3. Real SHA Verification
* **Script:** `gateA.js`
* **Process:** For each image, the true physical SHA-256 was computed locally, compared against the trusted reference `ENGINEER1_APTOS_701_IMAGE_HASHES.json`, and actively injected into the Node.js production inference adapter.
* **Result:** 701 / 701 Hashes matched. 0 Mismatches.

## 4. Decode Reverification
* **Script:** `gateB.py`
* **Process:** Every image in the 701-image validation dataset had its binary header verified (yielding valid `\x89PNG\r\n\x1a\n`), and its pixel layout aggressively re-decoded using `PIL.Image.verify()` and `PIL.Image.load()`.
* **Result:** 701 / 701 Decoded cleanly. 0 Corrupt files. 0 Zero-byte sizes. 0 Missing files.

## 5. Real-SHA 701 Node Inference
* **Execution:** `gateA.js` dynamically evaluated the dataset using the corrected production environment with real file paths and true SHA-256 constraints.
* **Output:** `validation/phase19/node_predictions_701_real_sha.json`
* **Status:** 701 / 701 Processed successfully. 0 Inference failures.

## 6. Fresh Metrics
Independently aggregated from the true-SHA Node.js inference JSON:
* **True Positives (TP):** 249
* **True Negatives (TN):** 377
* **False Positives (FP):** 40
* **False Negatives (FN):** 35
* **Sensitivity:** 87.68%
* **Specificity:** 90.41%
* **Accuracy:** 89.30%
* **PPV:** 86.16%
* **NPV:** 91.50%

## 7. Python / Node Parity
* **Exact Grade Agreement:** 699 / 701
* **Referable Agreement:** 699 / 701
* **Mean Confidence Delta:** 0.003519
* **Note:** The exact grade agreement (699/701) holds identical to Phase 18; replacing `'mock'` SHAs with true ones did not mutate tensor processing.

## 8. Backend Regression
* **Command:** `cd retinaguard-backend && npm test`
* **Constraints:** No bypass flags utilized (`|| true` removed, `--passWithNoTests` removed).
* **Result:** Exit Code 0.
* **Coverage:** 20 Test Suites passed, 91 tests passed, 2 traditionally skipped tests, 0 tests failed. No new skipped tests introduced.

## 9. Safety Regression
* **Coverage:** Validated by `npm test` exiting 0 without flags, directly running `tests/unit/onnxSafety.test.js` and `tests/unit/matlabContracts.test.js`.
* **Verdict:** Fail-closed semantics strictly preserve abstentions when encountering missing/corrupt models and invalid images.

## 10. Performance
Measured over a 10-image uniform sample using dynamically computed true SHA-256 strings:
* **Sample Count:** 10 images
* **Mean Preprocessing Latency:** 55.0 ms
* **Mean Inference Latency:** 73.8 ms
* **Mean Total Analysis Latency:** ~128.8 ms

## 11. Remaining Limitations
* Observed performance is derived purely from the locked 701-image validation replay.
* No claims of clinical validation, true real-world diagnostic capability, or regulatory readiness are made herein.

## 12. Final Verdict
**PHASE 19.1 PASS.**
The validation evidence gap has been completely repaired. All production integration mechanics, fail-closed safety behaviors, cryptographic checks, and numeric parity targets have been verifiably fulfilled and documented.
