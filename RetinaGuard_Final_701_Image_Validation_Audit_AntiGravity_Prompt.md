# RetinaGuard — Final 701-Image Validation Audit
## Anti-Gravity Master Prompt
### Phase: Final Evidence Review — Do Not Re-run the 701-Image Evaluation

---

# 0. MISSION

The full 701-image labeled validation execution has completed successfully.

Current reported execution state:

```text
Images evaluated:       701 / 701
Failures:               0
Workers:                8
Wall-clock elapsed:     1905.8 seconds
```

The purpose of this phase is **not to run the model again**.

The purpose is to perform a strict forensic audit of the already-generated evidence and determine:

1. exactly what model-performance results were obtained;
2. whether the 701-image cohort and labels are trustworthy;
3. whether the independent Python-vs-Node preprocessing → ONNX parity test was actually completed;
4. whether the remaining preprocessing drift affects model decisions;
5. whether the final metrics are reproducible and internally consistent;
6. what final engineering status is justified.

---

# 1. ABSOLUTE RULE: DO NOT RE-RUN THE 701-IMAGE EVALUATION

Do NOT:

```text
rerun all 701 images
change the evaluation code
change the model
change preprocessing
change labels
change thresholds
change class mapping
change the validation cohort
```

Unless a concrete evidence defect is discovered, this is an **audit-only phase**.

If a missing calculation can be performed from existing prediction files, calculate it without rerunning inference.

---

# 2. FROZEN MODEL ARTIFACT

Verify the model associated with the completed evaluation.

Canonical model:

```text
retinaguard_resnet18.onnx
```

Expected SHA-256:

```text
C49E78C9B6C7BFA5B0098BD40A3901D02C7B41C9598CAC993891B29263476F3F
```

Check the hash of the model used by the completed evaluation if that information is available.

If the hash differs:

```text
STOP
FINAL MODEL-PERFORMANCE EVIDENCE = NOT VALIDATED
```

Do not silently substitute the expected model.

---

# 3. LOCATE THE ACTUAL EVIDENCE

Inspect the generated artifacts.

Priority order:

```text
CLINICAL_EVALUATION_RESULTS.json
RetinaGuard_Clinical_Performance_Report.md
CLINICAL_EVALUATION_MANIFEST.json
MODEL_PREDICTIONS.csv
CONFUSION_MATRIX.csv
ERROR_ANALYSIS.csv
INDEPENDENT_ONNX_OUTPUT_PARITY.json
INDEPENDENT_PREPROCESSING_TENSOR_PARITY.json
INDEPENDENT_ONNX_PARITY_REPORT.md
PREPROCESSING_PARITY_REPORT.md
ONNX_VALIDATION_EVIDENCE_REGISTER.json
```

If the exact filenames differ:

```text
locate the generated equivalent
```

Do not create duplicate evidence merely because a filename is different.

---

# 4. VALIDATION COHORT INTEGRITY

Verify the exact evaluation population.

Report:

```text
Expected validation images:
Actual evaluated images:
Successful:
Failed:
Skipped:
Duplicate image IDs:
Missing image files:
Missing labels:
```

Expected:

```text
701 images
0 failures
```

But verify from the artifacts rather than trusting a summary statement.

---

# 5. VALIDATION MANIFEST AUDIT

Inspect:

```text
CLINICAL_EVALUATION_MANIFEST.json
```

Verify every evaluated image has:

```text
filename
path
ground_truth label
```

Check:

```text
one image → one label
no duplicate IDs
no conflicting labels
no fabricated labels
```

If the manifest contains fewer or more than 701 rows, explain why.

---

# 6. LABEL PROVENANCE AUDIT

Identify the exact source of the labels.

Document:

```text
label source file
dataset name/source
label column
image-ID column
number of label rows
validation-manifest generation method
```

The expected DR diagnosis domain is:

```text
0
1
2
3
4
```

Verify there are no unexpected values.

Do NOT infer labels from:

```text
model predictions
confidence
referable status
filenames
folder names
```

If label provenance cannot be established:

```text
MODEL PERFORMANCE VALIDATION = BLOCKED
```

---

# 7. VALIDATION SPLIT PROVENANCE

Determine whether the 701-image cohort is genuinely the intended validation split.

Inspect:

```text
model/RetinaGuard_ML/processed/val_manifest.csv
```

and document:

```text
number of rows
ID column
diagnosis column
split provenance
relationship to training data
```

If there is insufficient evidence that the cohort was held out from training:

```text
do not call it an independent validation set
```

Use:

```text
labeled evaluation cohort
```

and document the limitation.

---

# 8. EXTRACT THE ACTUAL MODEL METRICS

From the completed prediction artifacts, calculate or independently verify:

```text
Confusion matrix
Accuracy

Per-class precision
Per-class recall
Per-class F1

Macro precision
Macro recall
Macro F1

Weighted precision
Weighted recall
Weighted F1
```

For each class:

```text
Class 0
Class 1
Class 2
Class 3
Class 4
```

Do not trust a summary metric without checking it against the per-image predictions when those predictions are available.

---

# 9. OPTIONAL ORDINAL METRIC

If Quadratic Weighted Kappa (QWK) exists:

```text
verify implementation
verify labels
verify predictions
verify calculation
```

Only report QWK if its calculation can be independently confirmed.

If QWK was not calculated:

```text
QWK = NOT AVAILABLE
```

Do not invent it.

---

# 10. REFERABLE DR EVALUATION

Use the established RetinaGuard policy:

```text
Grade 0–1 → Non-referable
Grade 2–4 → Referable
```

The referable probability contract remains:

```text
P2 + P3 + P4
```

and the established threshold remains:

```text
>= 0.50
```

Do NOT change the threshold during this audit.

Calculate or verify:

```text
TP
TN
FP
FN

Sensitivity
Specificity
PPV
NPV
Accuracy
F1
```

Also report the denominators.

Example:

```text
Sensitivity = TP / (TP + FN)
Specificity = TN / (TN + FP)
```

Do not report a metric without stating the evaluated population.

---

# 11. DATASET DISTRIBUTION

Report the ground-truth class distribution:

```text
Class 0:
Class 1:
Class 2:
Class 3:
Class 4:
```

Report the prediction distribution:

```text
Predicted 0:
Predicted 1:
Predicted 2:
Predicted 3:
Predicted 4:
```

Report the referable distribution:

```text
Ground truth non-referable:
Ground truth referable:

Predicted non-referable:
Predicted referable:
```

This must be included because aggregate metrics can be misleading when class distributions are uneven.

---

# 12. CONFUSION MATRIX AUDIT

Generate:

```text
CONFUSION_MATRIX.csv
```

and a Markdown representation.

Verify:

```text
sum of all cells = evaluated image count
```

For 701 successful evaluations:

```text
sum(confusion_matrix) = 701
```

If it does not equal 701:

```text
STOP
investigate
```

---

# 13. ERROR ANALYSIS

Create or verify:

```text
ERROR_ANALYSIS.csv
```

At minimum:

```text
image_id
ground_truth
prediction
confidence
referable_probability
error_type
```

Use categories such as:

```text
correct
under-call
over-call
adjacent-grade error
multi-grade error
referable false negative
referable false positive
```

Do not infer clinical causes that are not supported by metadata or evidence.

---

# 14. CHECK LOW-CONFIDENCE / THRESHOLD CASES

Identify images where:

```text
referable_probability is close to 0.50
```

and images where:

```text
top-1 probability is close to top-2 probability
```

Report:

```text
image_id
ground_truth
predicted grade
referable probability
top probability
second probability
margin
```

This is an analysis of robustness, not permission to alter the threshold.

---

# 15. INDEPENDENT PYTHON-vs-NODE PARITY AUDIT

This is critical.

Do NOT assume:

```text
same tensor → Python ONNX
vs
same tensor → Node ONNX
```

is sufficient.

That only proves runtime parity.

Verify whether the actual independent experiment was:

```text
SAME ORIGINAL IMAGE
        ↓
Python training preprocessing
        ↓
Python ONNX Runtime
        ↓
Python output

VS

SAME ORIGINAL IMAGE
        ↓
Node deployment preprocessing
        ↓
Node ONNX Runtime
        ↓
Node output
```

This must start from the original image on both sides.

---

# 16. INDEPENDENT TENSOR PARITY

If the independent test was completed, report:

```text
Number of images compared

Tensor shape equality
dtype equality

max_abs_diff
mean_abs_diff
RMSE
median_abs_diff
P95
P99

percentage <= 1e-6
percentage <= 1e-5
percentage <= 1e-4
percentage <= 1e-3
```

Also report per-channel results:

```text
R
G
B
```

---

# 17. INDEPENDENT ONNX OUTPUT PARITY

For the same original images compare:

```text
Python logits
Node logits

Python probabilities
Node probabilities

Python predicted grade
Node predicted grade

Python referable probability
Node referable probability

Python referable flag
Node referable flag
```

Report:

```text
logit max absolute difference
probability max absolute difference
prediction mismatches
referable-decision mismatches
```

---

# 18. CRITICAL PARITY INTERPRETATION

Current preprocessing remediation evidence reports approximately:

```text
Max absolute difference = 0.0581
RMSE = 0.0317
Match rate <= 1e-6 = 51.53%
```

Do NOT automatically call this:

```text
exact numerical parity
```

The correct distinction is:

```text
algorithmic parity
vs
numeric tensor parity
vs
model-output parity
vs
decision parity
```

Determine which of these is actually supported by evidence.

---

# 19. DOWNSTREAM EFFECT OF PREPROCESSING DRIFT

The remaining preprocessing drift is acceptable only if downstream behavior has been explicitly measured.

Determine whether the independent comparison demonstrates:

```text
same predicted grade
same referable decision
stable probabilities within documented tolerance
```

If yes:

```text
PREPROCESSING DRIFT = MEASURED AND DOWNSTREAM DECISION STABILITY DEMONSTRATED
```

If no:

```text
PREPROCESSING DRIFT = OPEN VALIDATION ISSUE
```

Do not hide a mismatch.

---

# 20. CROSS-RUNTIME DECISION CONSISTENCY

Report:

```text
Number of images compared:
Grade mismatches:
Referable mismatches:
Maximum probability delta:
Maximum referable-probability delta:
```

If all match:

```text
decision consistency = PASS
```

If any mismatch exists:

```text
decision consistency = REVIEW REQUIRED
```

---

# 21. DETERMINISM

Verify from existing evidence:

```text
same image
same model
same environment
repeated execution
```

Expected:

```text
stable outputs
```

Do not rerun the full cohort merely to test determinism if existing evidence is sufficient.

---

# 22. PERFORMANCE INTERPRETATION

The completed run reports:

```text
Wall-clock elapsed = 1905.8 seconds
Workers = 8
```

Calculate true wall-clock throughput:

```text
701 / 1905.8
```

Also calculate:

```text
seconds per processed image, wall-clock equivalent
```

Do NOT confuse:

```text
per-worker accumulated time
```

with:

```text
wall-clock end-to-end throughput
```

Document the reported bottleneck:

```text
OpenCV.js WASM GaussianBlur, 101x101
```

This is a performance observation, not a model-quality problem.

Do not alter preprocessing merely to improve speed unless a new validation cycle is explicitly initiated.

---

# 23. MODEL-PERFORMANCE CLAIM DISCIPLINE

Use precise terminology.

Preferred:

```text
Labeled validation-set performance evaluation
```

or:

```text
Model performance measured on the 701-image validation cohort
```

Do NOT automatically say:

```text
clinical validation complete
clinically proven
clinically accurate
diagnostically validated
regulatory validated
production clinical readiness
```

Technical evaluation metrics do not by themselves establish those broader claims.

---

# 24. COMPARE AGAINST HISTORICAL TRAINING METRICS

If historical training/validation metrics are available in the repository, report them separately.

For example:

```text
Historical reported metric
vs
Current deployment evaluation metric
```

Do not silently merge the two.

Explicitly distinguish:

```text
historical training/evaluation evidence
current deployment evaluation evidence
```

If they differ, report the difference rather than selecting whichever result looks better.

Do NOT invent an explanation for discrepancies.

---

# 25. FINAL EVIDENCE REGISTER UPDATE

Update:

```text
ONNX_VALIDATION_EVIDENCE_REGISTER.json
```

with fresh evidence IDs covering:

```text
dataset integrity
label provenance
701-image evaluation
classification metrics
referable metrics
error analysis
independent cross-runtime parity
performance
limitations
```

Use this structure:

```json
{
  "id": "FINAL-001",
  "claim": "...",
  "status": "PASS|PARTIALLY_VERIFIED|BLOCKED|UNVERIFIED",
  "source": "...",
  "artifact": "...",
  "result": "...",
  "limitations": "..."
}
```

Do not overwrite historical evidence.

---

# 26. FINAL REPORT

Create:

```text
RETINAGUARD_FINAL_VALIDATION_AUDIT.md
```

Use this structure:

```markdown
# RetinaGuard — Final Validation Audit

## 1. Executive Summary

## 2. Frozen Model Artifact

## 3. Validation Cohort

## 4. Label Provenance

## 5. Dataset Integrity

## 6. Ground-Truth Distribution

## 7. Prediction Distribution

## 8. Confusion Matrix

## 9. Classification Metrics

## 10. Referable DR Metrics

## 11. Error Analysis

## 12. Independent Python-vs-Node Tensor Parity

## 13. Independent Python-vs-Node ONNX Output Parity

## 14. Decision Consistency

## 15. Determinism

## 16. Runtime / Performance

## 17. Historical Metric Comparison

## 18. Limitations

## 19. Evidence Register

## 20. Final Status
```

---

# 27. FINAL STATUS VOCABULARY

Choose exactly one.

### `MODEL PERFORMANCE EVALUATED — EVIDENCE COMPLETE`

Use only when:

```text
701-image cohort verified
labels verified
predictions complete
metrics reproducible
model hash verified
```

### `MODEL PERFORMANCE EVALUATED — WITH TECHNICAL LIMITATIONS`

Use when performance metrics are valid but:

```text
independent cross-runtime parity
preprocessing numerical drift
dataset provenance
or another engineering limitation
```

remains partially unresolved.

### `FINAL PERFORMANCE EVALUATION INCOMPLETE`

Use when a required evidence component is missing or contradictory.

Do NOT upgrade the status merely because all 701 predictions exist.

---

# 28. FINAL RESPONSE FORMAT

Return:

```text
FINAL VALIDATION STATUS:
<exact status>

MODEL HASH:
PASS / FAIL

VALIDATION COHORT:
701 / actual

SUCCESS:
...

FAILURES:
...

LABEL PROVENANCE:
...

GROUND-TRUTH DISTRIBUTION:
...

PREDICTION DISTRIBUTION:
...

ACCURACY:
...

MACRO F1:
...

WEIGHTED F1:
...

PER-CLASS METRICS:
...

REFERABLE TP:
...

REFERABLE TN:
...

REFERABLE FP:
...

REFERABLE FN:
...

REFERABLE SENSITIVITY:
...

REFERABLE SPECIFICITY:
...

REFERABLE PPV:
...

REFERABLE NPV:
...

REFERABLE F1:
...

INDEPENDENT PYTHON-vs-NODE PARITY:
PASS / PARTIAL / BLOCKED

TENSOR RMSE:
...

LOGIT MAX DELTA:
...

PROBABILITY MAX DELTA:
...

GRADE MISMATCHES:
...

REFERABLE MISMATCHES:
...

PREPROCESSING DRIFT:
...

DETERMINISM:
PASS / FAIL

WALL-CLOCK TIME:
1905.8 s

WALL-CLOCK THROUGHPUT:
...

PRIMARY PERFORMANCE BOTTLENECK:
...

LIMITATIONS:
...

EVIDENCE FILES:
...

FINAL CONCLUSION:
<evidence-backed statement only>
```

---

# 29. MOST IMPORTANT RULE

Do not make the final conclusion from the summary paragraph alone.

The conclusion must be derived from:

```text
actual per-image predictions
+
actual ground-truth labels
+
actual confusion matrix
+
actual metrics
+
actual cross-runtime comparison
+
actual model hash
```

If any of these materially conflicts:

```text
STOP
```

and report the conflict instead of choosing the more favorable result.

The purpose of this phase is to **freeze trustworthy evidence**, not to make the numbers look good.
