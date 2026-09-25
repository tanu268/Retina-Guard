# RetinaGuard — Independent Python-vs-Node Preprocessing → ONNX Output Parity Validation + Labeled Dataset Performance Validation
## Anti-Gravity Master Execution Prompt
### SIH 2026 · RetinaGuard
### Phase: Independent Cross-Runtime Validation → Labeled Dataset Evaluation

---

# 0. MISSION

You are now operating as the **Independent Cross-Runtime Validation & Model Evaluation Engineer** for RetinaGuard.

The preprocessing remediation phase has already corrected the major algorithmic mismatch in the Node.js deployment pipeline by moving the relevant preprocessing operations to `@techstark/opencv-js`.

The current evidence establishes:

```text
Python ↔ Node ONNX Runtime parity on the EXACT SAME binary tensor
= PASS

Node preprocessing algorithmic reproduction
= ACHIEVED

Remaining preprocessing tensor drift
= MEASURED
```

However, one critical validation gap remains:

> We have not yet independently demonstrated that the complete Python training-preprocessing path and the complete Node deployment-preprocessing path produce equivalent ONNX model outputs when starting from the same original image.

This phase must therefore validate:

```text
ORIGINAL IMAGE
      ↓
Python training preprocessing
      ↓
Python ONNX Runtime
      ↓
Python output
              VS
ORIGINAL IMAGE
      ↓
Node deployment preprocessing
      ↓
Node ONNX Runtime
      ↓
Node output
```

After that, once a valid ground-truth label source is available, evaluate the model on the actual labeled validation cohort.

The two activities MUST remain separate:

```text
PHASE A
Independent Python-vs-Node technical parity

PHASE B
Labeled-dataset model-performance evaluation
```

Do not use Phase B to hide or compensate for unresolved Phase A discrepancies.

---

# 1. NON-NEGOTIABLE RULES

## 1.1 Frozen model

Use only the current canonical ONNX artifact:

```text
retinaguard_resnet18.onnx
```

Expected SHA-256:

```text
C49E78C9B6C7BFA5B0098BD40A3901D02C7B41C9598CAC993891B29263476F3F
```

Before testing:

```text
calculate SHA-256
compare with expected hash
```

If the hash differs:

```text
STOP
```

and report that a different model artifact is being evaluated.

---

## 1.2 No model modification

Do NOT:

```text
retrain
fine-tune
change weights
change architecture
change class ordering
change normalization constants
change threshold to improve results
```

This phase is validation, not model tuning.

---

## 1.3 No label fabrication

Never generate labels from:

```text
model predictions
confidence scores
referable flag
filename patterns
folder names
human assumptions
```

Ground truth must come from a documented external/official label source or a verified project annotation source.

---

## 1.4 No clinical overclaiming

Even a strong validation result does NOT automatically establish:

```text
clinical validity
clinical safety
regulatory approval
diagnostic accuracy in practice
generalization to other populations
production clinical readiness
```

Keep engineering validation and clinical validation explicitly separate.

---

# 2. AUTHORITATIVE INPUTS

Inspect and use the current repository/evidence:

```text
retinaguard_resnet18.onnx
src/inference/preprocess.js
src/inference/adapters/onnxAdapter.js
model/RetinaGuard_ML/src/preprocessing.py
scripts/verify_preprocessing.py
scripts/verify_inference.py
PREPROCESSING_PARITY_REPORT.md
PREPROCESSING_OPERATION_MATRIX.md
ONNX_VALIDATION_EVIDENCE_REGISTER.json
REMEDIATION_CHANGE_RECORD.md
training/model contract files
existing dataset manifests
```

Also inspect the current validation dataset directory and existing test scripts before creating new ones.

Do not silently replace existing validation logic.

---

# 3. PHASE A — INDEPENDENT PYTHON-vs-NODE PREPROCESSING → ONNX PARITY

## 3.1 Objective

Use the same original image as input to both independently implemented pipelines:

```text
Python:
image
→ authoritative training preprocessing
→ float32 NCHW tensor
→ Python ONNX Runtime

Node:
image
→ deployment preprocessing
→ float32 NCHW tensor
→ Node ONNX Runtime
```

Then compare the complete outputs.

This is the critical missing test.

---

# 4. TEST COHORT FOR PHASE A

Start with a deterministic representative cohort.

Minimum:

```text
10 images
```

Preferably include diverse examples across image quality and disease severity when labels are available.

If a larger labeled set is available, use:

```text
all available validation images
```

Do not select images based on expected prediction.

Create a fixed manifest:

```text
INDEPENDENT_PARITY_IMAGE_MANIFEST.json
```

Containing:

```json
{
  "images": [
    {
      "filename": "...",
      "sha256": "..."
    }
  ]
}
```

Hash each image so the exact test inputs are reproducible.

---

# 5. PYTHON REFERENCE PIPELINE

Implement or use a Python validation script that performs:

```text
load original image
→ authoritative training preprocessing
→ final float32 NCHW tensor
→ ONNX Runtime
→ logits
→ softmax probabilities
→ argmax class
→ referable probability
→ referable flag
```

Do not reuse an already generated Node tensor.

The Python side must independently start from the original image.

Save:

```text
python_tensor_<image>.bin
python_output_<image>.json
```

or one structured aggregate file.

---

# 6. NODE DEPLOYMENT PIPELINE

Run the actual Node deployment path:

```text
original image
→ src/inference/preprocess.js
→ onnxruntime-node
→ postprocessing
```

Do not feed the Python-generated tensor into Node for this phase.

That test already exists as runtime parity.

This phase is explicitly:

```text
same IMAGE
→ independent preprocessing
→ independent inference
```

Save:

```text
node_tensor_<image>.bin
node_output_<image>.json
```

---

# 7. TENSOR COMPARISON

For every image compare Python vs Node final preprocessing tensors.

Required metrics:

```text
shape equality
dtype equality

max_abs_diff
mean_abs_diff
RMSE
median_abs_diff
P95 absolute difference
P99 absolute difference

percentage <= 1e-6
percentage <= 1e-5
percentage <= 1e-4
percentage <= 1e-3
```

Also calculate per channel:

```text
R
G
B
```

And verify:

```text
Python tensor shape = [1,3,384,384]
Node tensor shape   = [1,3,384,384]
Python dtype        = float32
Node dtype          = float32
```

Create:

```text
INDEPENDENT_PREPROCESSING_TENSOR_PARITY.json
INDEPENDENT_PREPROCESSING_TENSOR_PARITY.md
```

---

# 8. ONNX OUTPUT COMPARISON

For each image compare:

## 8.1 Raw logits

For each of the 5 classes:

```text
Python logit
Node logit
absolute delta
relative delta where meaningful
```

Calculate:

```text
max_logit_abs_diff
mean_logit_abs_diff
RMSE_logits
```

## 8.2 Probabilities

Compare:

```text
P0
P1
P2
P3
P4
```

Calculate:

```text
max_probability_abs_diff
mean_probability_abs_diff
RMSE_probability
```

## 8.3 Predicted grade

Verify:

```text
Python predicted grade
Node predicted grade
```

must match for every image unless a documented numerical edge case explains otherwise.

## 8.4 Referable probability

Verify:

```text
referableProbability = P2 + P3 + P4
```

Compare:

```text
Python referable probability
Node referable probability
absolute difference
```

## 8.5 Referable flag

Verify:

```text
grade 0–1 → non-referable
grade 2–4 → referable
```

and the implementation threshold remains:

```text
referableProbability >= 0.50
```

Do not alter the threshold during this phase.

---

# 9. OUTPUT PARITY ACCEPTANCE

Do not define acceptance only by matching predicted class.

Use a multi-level result:

### Level 1 — Tensor parity

Document whether the preprocessing tensors are:

```text
EXACT
NUMERICALLY CLOSE
MEASURABLY DIFFERENT
```

### Level 2 — Logit parity

Document the observed maximum and distribution of differences.

### Level 3 — Probability parity

Document the observed probability differences.

### Level 4 — Decision parity

Document:

```text
predicted grade equality
referable flag equality
```

### Level 5 — Stability

Check whether any image lies near:

```text
argmax decision boundary
referable threshold = 0.50
```

If a small preprocessing perturbation changes a prediction or referable status:

```text
FLAG FOR REVIEW
```

Do not hide the discrepancy.

---

# 10. EDGE-CASE TESTING

Specifically inspect images with:

```text
very low confidence
probabilities near 0.50 referable threshold
close logits between top two classes
extreme illumination
poor image quality
unusual crop geometry
```

These are important because small preprocessing differences matter most near decision boundaries.

Report those separately.

---

# 11. DETERMINISM

For at least 5 repeated evaluations per selected image:

```text
same image
same model
same environment
same preprocessing
```

verify:

```text
tensor repeatability
logit repeatability
probability repeatability
predicted class repeatability
referable flag repeatability
```

Expected:

```text
no unexplained variation
```

---

# 12. PHASE A REQUIRED ARTIFACTS

Create:

```text
INDEPENDENT_PARITY_IMAGE_MANIFEST.json
INDEPENDENT_PREPROCESSING_TENSOR_PARITY.json
INDEPENDENT_PREPROCESSING_TENSOR_PARITY.md
INDEPENDENT_ONNX_OUTPUT_PARITY.json
INDEPENDENT_ONNX_OUTPUT_PARITY.md
INDEPENDENT_ONNX_PARITY_REPORT.md
```

Update:

```text
ONNX_VALIDATION_EVIDENCE_REGISTER.json
```

with new evidence IDs.

Do not overwrite historical evidence.

---

# 13. PHASE B — FIND AND VERIFY GROUND TRUTH

Only begin Phase B after Phase A has been completed or clearly classified as blocked.

The objective is to obtain a valid label mapping for the exact images being evaluated.

For APTOS-based evaluation, inspect the dataset/project for an official label manifest such as:

```text
train.csv
```

or an explicitly documented equivalent.

Do NOT assume that any random CSV is the correct source.

Inspect:

```text
columns
image IDs
diagnosis values
dataset version
image directory
```

The canonical mapping must be documented.

---

# 14. LABEL RECONCILIATION

Build the evaluation dataset by matching:

```text
actual image filename / ID
        ↕
ground-truth image ID
```

Normalize only the filename representation necessary for matching, for example:

```text
id_code
vs
id_code.png
```

Do not alter the underlying identifier semantics.

Produce a reconciliation report:

```text
total image files
total ground-truth rows
matched images
unmatched images
missing labels
duplicate IDs
duplicate labels
invalid diagnosis values
```

Create:

```text
LABEL_RECONCILIATION_REPORT.md
```

---

# 15. DATASET INTEGRITY CHECKS

Before evaluation, verify:

```text
no duplicate image IDs
no duplicate conflicting labels
all evaluated images have one ground-truth label
diagnosis values are valid
image files are readable
image-to-label matching is deterministic
```

Expected APTOS diagnosis domain:

```text
0
1
2
3
4
```

If unexpected values occur:

```text
STOP
```

and investigate.

Do not silently coerce them.

---

# 16. VALIDATION SPLIT INTEGRITY

Determine exactly which cohort is being evaluated.

Document:

```text
dataset source
dataset version if known
number of images
train/validation/test designation
split-generation method
whether this split was used during model development
```

Do not accidentally evaluate on images used to train the model if the objective is independent validation.

If the repository contains a pre-existing 701-image validation split, verify its provenance rather than assuming it is independent.

---

# 17. MODEL EVALUATION PIPELINE

For each labeled validation image:

```text
original image
→ final Node deployment preprocessing
→ Node ONNX Runtime
→ probabilities
→ predicted class
```

Store:

```text
image_id
ground_truth
predicted_grade
P0
P1
P2
P3
P4
referable_probability
referable_prediction
```

Create:

```text
MODEL_PREDICTIONS.csv
```

Do not replace missing predictions with guesses.

---

# 18. CLASSIFICATION METRICS

Calculate:

```text
confusion matrix
overall accuracy
per-class precision
per-class recall
per-class F1
macro F1
weighted F1
```

For ordinal DR grades, also consider:

```text
quadratic weighted kappa (QWK)
```

only if the implementation is correct and the dataset structure supports it.

Do not present QWK unless verified.

---

# 19. REFERABLE DR METRICS

Convert:

```text
ground-truth grade:
0–1 = non-referable
2–4 = referable
```

and compare against the system's referable decision.

Calculate:

```text
TP
TN
FP
FN
sensitivity
specificity
PPV
NPV
accuracy
F1
```

Also report the denominator for each metric.

Do not state a metric without its population.

---

# 20. CONFIDENCE / THRESHOLD ANALYSIS

Do not change the production threshold merely to improve the reported metrics.

The canonical referable threshold remains:

```text
0.50
```

If threshold analysis is useful, perform it as a separate research analysis:

```text
0.10
0.20
...
0.90
```

but clearly label it:

```text
EXPLORATORY ONLY
```

Do not silently promote an exploratory threshold into production configuration.

---

# 21. ERROR ANALYSIS

Produce a structured error table containing at least:

```text
image_id
ground_truth
prediction
confidence
referable_probability
error_type
```

Categorize errors:

```text
correct
under-call
over-call
adjacent-grade error
multi-grade error
referable false negative
referable false positive
```

Do not infer clinical causes such as disease characteristics unless evidence supports them.

---

# 22. DATASET DISTRIBUTION

Report:

```text
ground-truth class counts
prediction class counts
referable/non-referable ground-truth counts
referable/non-referable predicted counts
```

This is necessary to interpret aggregate metrics.

Do not compare metrics from different populations without stating the population.

---

# 23. SUBGROUP ANALYSIS

Only perform subgroup analysis where reliable metadata exists.

Potential metadata may include:

```text
image quality
camera/device
site
demographic information
```

Do not invent subgroup labels from filenames.

If metadata is absent:

```text
SUBGROUP ANALYSIS = NOT AVAILABLE
```

---

# 24. CROSS-RUNTIME PERFORMANCE CONSISTENCY

For a subset of labeled images compare:

```text
Python inference result
Node inference result
```

and verify:

```text
prediction equality
referable decision equality
probability drift
```

This cross-runtime check is separate from performance metrics.

The purpose is:

```text
same model + same original image
→ Python and Node should produce materially equivalent results
```

---

# 25. REQUIRED PERFORMANCE ARTIFACTS

Create:

```text
MODEL_PREDICTIONS.csv
CONFUSION_MATRIX.csv
MODEL_PERFORMANCE_REPORT.md
REFERABLE_DR_PERFORMANCE_REPORT.md
ERROR_ANALYSIS.csv
DATASET_DISTRIBUTION_REPORT.md
```

Update:

```text
ONNX_VALIDATION_EVIDENCE_REGISTER.json
```

with separate evidence IDs for:

```text
dataset integrity
label reconciliation
classification metrics
referable metrics
cross-runtime consistency
```

---

# 26. DO NOT CLAIM PERFORMANCE VALIDATION WHEN:

Do not mark model performance as validated when:

```text
labels are missing
image-label matching is uncertain
the evaluated cohort is unknown
predictions were generated with a different model hash
the preprocessing pipeline is not the deployment pipeline
the validation set overlaps training data without disclosure
metrics cannot be reproduced
```

Use:

```text
MODEL PERFORMANCE VALIDATION = BLOCKED
```

when any critical prerequisite is absent.

---

# 27. REQUIRED FINAL STATUS VOCABULARY

## A. `INDEPENDENT CROSS-RUNTIME PARITY VERIFIED`

Use when:

```text
same original images
→ independently preprocessed
→ independently inferred
```

produce stable and sufficiently equivalent outputs under documented tolerances.

---

## B. `INDEPENDENT CROSS-RUNTIME PARITY VERIFIED WITH MEASURED PREPROCESSING DRIFT`

Use when tensor-level drift remains but:

```text
drift is quantified
logit drift is quantified
probability drift is quantified
predicted grades remain stable
referable decisions remain stable
```

and the acceptance rationale is documented.

---

## C. `INDEPENDENT CROSS-RUNTIME PARITY BLOCKED`

Use when the independent end-to-end comparison cannot be reproduced or a required component is unavailable.

---

## D. `MODEL PERFORMANCE VALIDATED ON LABELED VALIDATION COHORT`

Use only when:

```text
ground truth is verified
dataset reconciliation passes
evaluation uses the frozen model
evaluation uses final deployment preprocessing
metrics are reproducible
```

This is a technical model-performance statement, not a blanket clinical-validation statement.

---

## E. `TECHNICALLY RE-VALIDATED — CLINICAL VALIDATION REMAINS OUTSIDE CURRENT EVIDENCE`

Use when the technical pipeline and labeled-dataset evaluation are complete but broader clinical validation has not been established.

---

# 28. FINAL REPORT

Create:

```text
INDEPENDENT_ONNX_PARITY_AND_MODEL_PERFORMANCE_REPORT.md
```

Use this structure:

```markdown
# RetinaGuard — Independent Cross-Runtime Parity & Model Performance Report

## 1. Executive Summary

## 2. Frozen Model Artifact

## 3. Phase A — Independent Python vs Node Parity

### 3.1 Test Cohort
### 3.2 Tensor Comparison
### 3.3 Logit Comparison
### 3.4 Probability Comparison
### 3.5 Predicted Grade Comparison
### 3.6 Referable Decision Comparison
### 3.7 Edge Cases
### 3.8 Determinism

## 4. Phase B — Ground Truth Dataset

### 4.1 Source
### 4.2 Dataset Reconciliation
### 4.3 Split Integrity
### 4.4 Class Distribution

## 5. Model Performance

### 5.1 Confusion Matrix
### 5.2 Accuracy
### 5.3 Per-Class Precision / Recall / F1
### 5.4 Macro F1
### 5.5 Weighted F1
### 5.6 QWK if verified

## 6. Referable DR Performance

### 6.1 Sensitivity
### 6.2 Specificity
### 6.3 PPV
### 6.4 NPV
### 6.5 F1
### 6.6 Confusion Matrix

## 7. Error Analysis

## 8. Cross-Runtime Consistency

## 9. Limitations

## 10. Evidence Register

## 11. Final Status
```

---

# 29. EXECUTION ORDER

Follow exactly:

```text
PHASE A — INDEPENDENT CROSS-RUNTIME PARITY

1. Verify model hash
2. Verify environment
3. Select deterministic image cohort
4. Hash test images
5. Run Python preprocessing from original images
6. Run Python ONNX Runtime
7. Run Node preprocessing from original images
8. Run Node ONNX Runtime
9. Compare final tensors
10. Compare logits
11. Compare probabilities
12. Compare predicted grades
13. Compare referable probability
14. Compare referable decisions
15. Run edge-case analysis
16. Run determinism
17. Produce Phase A evidence

PHASE B — LABELED DATASET

18. Identify authoritative ground-truth source
19. Verify dataset provenance
20. Reconcile image IDs
21. Detect missing/duplicate/conflicting labels
22. Verify validation split
23. Freeze evaluation manifest
24. Run final Node deployment pipeline
25. Save per-image predictions
26. Calculate confusion matrix
27. Calculate classification metrics
28. Calculate referable metrics
29. Run error analysis
30. Verify cross-runtime consistency on labeled cohort
31. Produce Phase B evidence
32. Update evidence register
33. Produce final report
34. Assign exactly one final status
```

---

# 30. FINAL ANTI-GRAVITY RESPONSE FORMAT

At completion, report:

```text
MODEL HASH:
PASS / FAIL

PHASE A — INDEPENDENT PREPROCESSING:
PASS / PARTIAL / BLOCKED

TENSOR PARITY:
<key metrics>

LOGIT PARITY:
<key metrics>

PROBABILITY PARITY:
<key metrics>

PREDICTED GRADE CONSISTENCY:
<result>

REFERABLE DECISION CONSISTENCY:
<result>

DETERMINISM:
PASS / FAIL

GROUND-TRUTH DATASET:
AVAILABLE / BLOCKED

LABEL RECONCILIATION:
PASS / FAIL / BLOCKED

VALIDATION COHORT:
<number of images>

CLASSIFICATION METRICS:
<results>

REFERABLE DR METRICS:
<results>

ERROR ANALYSIS:
<result>

FINAL STATUS:
<one exact status from Section 27>

EVIDENCE FILES:
<paths>

REMAINING LIMITATIONS:
<only evidence-backed limitations>
```

Do not use:

```text
"looks good"
"production ready"
"clinically proven"
"diagnostically accurate"
"excellent"
"best"
```

Use measured, reproducible evidence only.

---

# 31. MOST IMPORTANT TEST

The single most important test in this phase is:

```text
                SAME ORIGINAL IMAGE
                       │
             ┌─────────┴─────────┐
             ↓                   ↓
        Python pipeline      Node pipeline
             ↓                   ↓
     Python preprocessing  Node preprocessing
             ↓                   ↓
      Python ONNX Runtime   Node ONNX Runtime
             ↓                   ↓
             └─────────┬─────────┘
                       ↓
              COMPARE FULL OUTPUT
```

Do not substitute:

```text
same tensor → Python vs Node
```

for this test.

That test proves runtime parity.

This test proves **end-to-end cross-runtime preprocessing + inference parity**.

Only after this test is complete should the labeled-dataset performance phase be treated as the final technical evaluation step.
