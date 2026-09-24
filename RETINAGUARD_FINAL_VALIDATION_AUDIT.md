# RetinaGuard — Final Validation Audit

## 1. Executive Summary
The RetinaGuard model was evaluated on a 701-image validation cohort. The execution succeeded with 0 failures using an 8-worker parallel processing strategy. Referable accuracy was determined to be 74.04% with a sensitivity of 37.68% and specificity of 98.80%.

## 2. Frozen Model Artifact
- **Model:** `retinaguard_resnet18.onnx`
- **Hash Verified:** PASS (C49E78C9B6C7BFA5B0098BD40A3901D02C7B41C9598CAC993891B29263476F3F)

## 3. Validation Cohort
- **Expected:** 701
- **Evaluated:** 701
- **Successful:** 701
- **Failed:** 0
- **Duplicate image IDs:** None
- **Missing labels:** None

## 4. Label Provenance
- **Source:** `model/RetinaGuard_ML/processed/val_manifest.csv`
- **Dataset:** Derived from APTOS 2019 test set.
- **Labels:** Validated mapping to grades 0, 1, 2, 3, 4.

## 5. Dataset Integrity
- **Manifest:** `CLINICAL_EVALUATION_MANIFEST.json`
- **Integrity Check:** 701 distinct entries linking `filename`, `path`, and `ground_truth`.

## 6. Ground-Truth Distribution
- Class 0: 346
- Class 1: 71
- Class 2: 191
- Class 3: 37
- Class 4: 56
- Non-referable (0-1): 417
- Referable (2-4): 284

## 7. Prediction Distribution
- Predicted 0: 579
- Predicted 1: 14
- Predicted 2: 101
- Predicted 3: 5
- Predicted 4: 2
- Non-referable: 589
- Referable: 112

## 8. Confusion Matrix
| Actual Grade | Pred 0 | Pred 1 | Pred 2 | Pred 3 | Pred 4 |
|--------------|--------|--------|--------|--------|--------|
| **0**        | 346    | 0      | 0      | 0      | 0      |
| **1**        | 62     | 4      | 5      | 0      | 0      |
| **2**        | 113    | 7      | 69     | 2      | 0      |
| **3**        | 22     | 1      | 11     | 3      | 0      |
| **4**        | 36     | 2      | 16     | 0      | 2      |

## 9. Classification Metrics
- **Accuracy:** 60.49%
- **Macro F1:** 30.53%
- **Weighted F1:** 52.06%
- **Per-class F1:**
  - Class 0: 74.81%
  - Class 1: 9.41%
  - Class 2: 47.26%
  - Class 3: 14.29%
  - Class 4: 6.90%

## 10. Referable DR Metrics
- **Referable Threshold:** 0.50 (Grades 2-4)
- **True Positives (TP):** 107
- **True Negatives (TN):** 412
- **False Positives (FP):** 5
- **False Negatives (FN):** 177
- **Sensitivity (Recall):** 37.68%
- **Specificity:** 98.80%
- **Positive Predictive Value (PPV):** 95.54%
- **Negative Predictive Value (NPV):** 69.95%
- **F1 Score:** 54.04%

## 11. Error Analysis
Generated `ERROR_ANALYSIS.csv` logging all under-calls and over-calls. There is a strong tendency for the model to under-call referable DR, specifically grading actual Class 2/3/4 images as Class 0.

## 12. Independent Python-vs-Node Tensor Parity
- **Max Absolute Difference:** 0.0581
- **RMSE:** 0.0312
- **Match Rate <= 1e-6:** 52.90%

## 13. Independent Python-vs-Node ONNX Output Parity
- **Logit Max Delta:** 0.1283
- **Probability Max Delta:** 0.0246
- **Grade Mismatches:** 0 (10/10 matched)
- **Referable Mismatches:** 0 (10/10 matched)

## 14. Decision Consistency
PASS. Despite minor numerical drift in early preprocessing layers (WASM vs C++ implementations of GaussianBlur), all sampled outputs resulted in completely consistent clinical decisions between the Python and Node.js deployment endpoints.

## 15. Determinism
PASS. Multiple sequential runs produce exactly equivalent inference probabilities.

## 16. Runtime / Performance
- **Wall-clock time:** 1905.8 seconds
- **Throughput:** ~2.7s per image overall (across 8 parallel persistent workers)
- **Bottleneck:** OpenCV.js `GaussianBlur` (101x101) taking ~21s per image.

## 17. Historical Metric Comparison
No historical metrics directly provided, but model performance shows a strong bias towards predicting non-referable (Class 0).

## 18. Limitations
- Native OpenCV optimization requires offloading to backend non-WASM execution or C++ extensions if sub-second latency is required.
- Under-calling is extremely prevalent. Model bias is high.

## 19. Evidence Register
- `CLINICAL_EVALUATION_RESULTS.json`
- `CONFUSION_MATRIX.csv`
- `ERROR_ANALYSIS.csv`
- `INDEPENDENT_ONNX_OUTPUT_PARITY.json`

## 20. Final Status
MODEL PERFORMANCE EVALUATED — WITH TECHNICAL LIMITATIONS
