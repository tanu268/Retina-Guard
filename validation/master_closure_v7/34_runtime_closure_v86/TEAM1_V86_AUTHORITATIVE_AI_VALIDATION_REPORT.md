# TEAM1 V8.6 AUTHORITATIVE AI VALIDATION REPORT

## 1. What exact model is currently deployed?
The currently deployed model is `model/retinaguard_resnet18.onnx`.
- **SHA256:** `C49E78C9B6C7BFA5B0098BD40A3901D02C7B41C9598CAC993891B29263476F3F`
- **Size:** 44.7 MB (44,708,258 bytes)
- **Input:** `input` (Float32, Shape `[1, 3, 384, 384]`)
- **Output:** `logits`
- **Engine:** `onnxruntime-node 1.30.0`

## 2. What exact preprocessing is currently deployed?
The current backend implementation in `retinaguard-backend/src/inference/preprocess.js` exclusively uses `sharp` and manual pixel manipulation. It performs:
- Image decoding and alpha channel removal
- Resize to 384x384 (fit: 'fill', kernel: 'linear')
- Pixel scaling (divided by 255.0)
- ImageNet Normalization (Mean: `[0.485, 0.456, 0.406]`, Std: `[0.229, 0.224, 0.225]`)
- Conversion to Float32 CHW tensor format

*Note: There is NO thresholding, morphological closing, connected components, or illumination correction present in the current Node implementation.*

## 3. Does it reproduce the training preprocessing?
**BLOCKED.** The actual training preprocessing script (`model/RetinaGuard_ML/src/preprocessing.py`) is missing from the repository. Consequently, exact mathematical parity between the original Python preprocessing pipeline and the current Node preprocessing pipeline cannot be verified.

## 4. Which validation dataset is authoritative?
The authoritative dataset is the 701-image APTOS validation cohort as defined in `model/datasets/val_manifest.csv`. It references images in the directory `D:\RetinaGuard_Data\aptos2019\train_images\`.

## 5. Are its labels currently available?
**FAIL (IMAGES MISSING).** While the labels (diagnoses) are present within `val_manifest.csv`, the actual validation image files are missing from the filesystem (`D:\RetinaGuard_Data\` is unreachable/non-existent). 

## 6. What are the fresh current metrics?
**BLOCKED.** Without the 701 validation images, a fresh inference replay cannot be executed. Therefore, current metrics (TP, TN, FP, FN, Sensitivity, Specificity, Accuracy, etc.) cannot be independently generated or verified against the current repository state.

## 7. Which historical metrics are stale/superseded?
| OLD REPORT | DATE | COMMIT | MODEL | PREPROCESSING | DATASET | METRICS | CURRENT STATUS |
|------------|------|--------|-------|---------------|---------|---------|----------------|
| RETINAGUARD_FINAL_VALIDATION_AUDIT.md | Historical | N/A | resnet18.onnx | Legacy OpenCV | APTOS 701 | Sensitivity: 37.68%, Specificity: 98.80%, Accuracy: 60.49% | **HISTORICAL / SUPERSEDED** |
| ENGINEER1_PHASE19_FINAL_PRODUCTION_AI_VALIDATION_REPORT.md | Historical | N/A | resnet18.onnx | Sharp ImageNet (Phase 18) | APTOS 701 | Sensitivity: 87.68%, Accuracy: 89.30% | **HISTORICAL (UNVERIFIABLE)** |

The 37.68% sensitivity was a result of the old OpenCV preprocessing logic that has since been replaced. The 87.68% sensitivity was achieved using the newer `sharp` ImageNet preprocessing, but must be classified as HISTORICAL since we cannot rerun the test to verify it.

## 8. Is technical inference verified?
**YES (TECHNICALLY INTEGRATED).**
While validation against a cohort is blocked, the model technically functions perfectly as an inference engine:
- **ONNX Engine Parity:** Passed exactly. Passing the same input tensor through both `onnxruntime-node` (Node) and `onnxruntime` (Python) produces identical logits (Max Diff: 0).
- **Postprocessing Parity:** Softmax probabilities, grade extraction, and referable calculations execute correctly.
- **Performance:** End-to-end latency averages ~116ms (Decode+Preprocess: ~53ms, ONNX Inference: ~63ms).
- **Determinism:** 10 repeated inferences on the same image produced 0 variance across all logits.

## 9. Is clinical validity established?
**CLINICAL VALIDITY NOT ESTABLISHED.**
The model operates correctly as software, but without a fresh evaluation against the validation cohort, no medical, clinical, or accuracy claims can be made. 

---
### FINAL DECISION
**AI VALIDATION PERFORMANCE BLOCKED**
(Missing 701-image validation cohort files and Python training preprocessing artifacts).
