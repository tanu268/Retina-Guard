# RetinaGuard — Engineer 3
## ONNX Validation, Inference Parity & Clinical-Performance Verification
### Anti-Gravity / BMPv2 Master Execution Prompt
### SIH 2026 · PS 26038

---

# 0. MISSION

You are Engineer 3 operating as a Principal ML Engineer, Inference Runtime Engineer, Computer Vision/Preprocessing Engineer, Model Validation Engineer, Backend ML Integration Engineer, Reproducibility Auditor, and Clinical-Performance Validation Lead.

The RetinaGuard ResNet-18 ONNX model is now executing through the Node.js backend. The previous phase proved that the ONNX adapter can execute the model and return the existing inference contract.

This phase is therefore **not primarily about making the model run**.

Your mission is to determine whether the deployed ONNX inference path is:

```text
correct
+
preprocessing-consistent
+
numerically reproducible
+
contract-compatible
+
frontend-integrated
+
deterministic
+
robust to failures
+
properly traceable
+
measurable against labeled data where available
```

The core question is:

> **Does the deployed ONNX path faithfully implement the trained ResNet-18 model and integrate it correctly into RetinaGuard, and what model-performance claims are actually supported by evidence?**

---

# 1. CURRENT AUTHORITATIVE BASELINE

Known model artifact:

```text
retinaguard_resnet18.onnx
```

Known evidence:

```text
File size: 44,708,258 bytes
SHA-256:
C49E78C9B6C7BFA5B0098BD40A3901D02C7B41C9598CAC993891B29263476F3F

Producer: PyTorch
IR version: 8
Opset: 17
Input: [dynamic, 3, 384, 384], float32, NCHW
Output: [dynamic, 5], float32 logits
```

Class mapping:

| Model Index | Backend Grade | Clinical Label |
|---:|---:|---|
| 0 | 0 | No Apparent DR |
| 1 | 1 | Mild NPDR |
| 2 | 2 | Moderate NPDR |
| 3 | 3 | Severe NPDR |
| 4 | 4 | PDR |

This mapping is already supported by the repository training labels and backend contract evidence. fileciteturn1file0L3-L14

The Node ONNX regression already demonstrated successful inference on local images with outputs including grade, referable status, confidence, and timing. fileciteturn1file1L3-L24

A direct single-inference artifact also records a successful real ONNX execution with grade probabilities, referable probability, model version, and runtime. fileciteturn1file4L2-L20

These artifacts prove technical execution on sampled inputs. They do **not** by themselves prove model accuracy or clinical validity.

---

# 2. ARCHITECTURAL TARGET

Preserve the existing architecture:

```text
React Frontend
      ↓
Express Backend
      ↓
Analysis Service
      ↓
Inference Adapter Boundary
      ↓
ONNX Adapter
      ↓
onnxruntime-node
      ↓
retinaguard_resnet18.onnx
```

MATLAB may remain a separate compatibility/Simulink path.

Do not redesign existing API contracts merely to accommodate ONNX.
Do not make the frontend aware of ONNX Runtime.

---

# 3. NON-NEGOTIABLE RULES

## 3.1 No fabricated performance

Never invent:

- accuracy
- sensitivity
- specificity
- F1
- QWK
- AUC
- confusion matrix
- calibration metrics
- thresholds
- probabilities

If a valid labeled validation dataset is unavailable, report:

```text
MODEL PERFORMANCE VALIDATION = BLOCKED
```

Do not present old training/validation numbers as fresh deployment measurements.

## 3.2 Separate technical inference from clinical validation

Always distinguish:

```text
technical inference execution
≠
model correctness
≠
dataset validation
≠
clinical validation
≠
regulatory approval
```

## 3.3 Do not modify model weights

Do not retrain or alter the ONNX artifact in this phase.

Do not reorder classes.
Do not change output semantics.
Do not tune results to match expected labels.

## 3.4 Preserve the backend contract

Do not redesign:

```text
POST /analysis/run
GET /api/v1/case/:case_uuid
```

Only make minimal integration changes if an actual defect is proven.

## 3.5 No fake clinical output

Never hardcode:

```text
grade
confidence
probabilities
referable
```

into the UI or backend merely to demonstrate success.

---

# 4. PHASE 0 — BASELINE SNAPSHOT

Before changing code, record:

```text
Git commit
Git status
Node version
NPM version
Python version
onnxruntime-node version
Python ONNX Runtime version
Model path
Model hash
Model size
MODEL_VERSION
INFERENCE_ENGINE / MATLAB_ADAPTER
Database state
Current regression result
```

Create:

```text
ONNX_VALIDATION_BASELINE.md
```

Do not modify production code during this phase.

---

# 5. PHASE 1 — MODEL ARTIFACT FORENSICS

Inspect and verify:

```text
IR version
Opset
Producer
Input name
Input shape
Input dtype
Output name
Output shape
Output dtype
Metadata
SHA-256
File size
```

Create:

```text
ONNX_MODEL_FORENSICS.json
```

Never use a different model artifact without explicitly documenting the change.

---

# 6. PHASE 2 — TRAINING CONTRACT RECONSTRUCTION

Inspect the original training pipeline, including:

```text
train_baseline.py
dataset.py
preprocessing.py
augmentation logic
class mapping
image resize
color conversion
normalization
tensor layout
```

Reconstruct the exact inference preprocessing contract.

Do not infer normalization from generic ImageNet conventions unless the training code proves that convention.

Create:

```text
MODEL_TRAINING_CONTRACT.md
```

Record:

```text
image format
color space
resize method
crop/mask
illumination handling
normalization
mean
std
tensor layout
datatype
training-only augmentations
inference preprocessing
```

---

# 7. PHASE 3 — PREPROCESSING PARITY

This is a critical gate.

Compare:

```text
Training preprocessing
        ↕
Node deployment preprocessing
```

For identical input images, validate equivalence of effective tensor semantics.

Test at minimum:

- normal image;
- referable-DR image where available;
- unusual dimension image;
- difficult/edge-case image.

Record safe intermediate diagnostics:

```text
original dimensions
processed dimensions
dtype
channel order
tensor shape
min
max
mean
std
```

Create:

```text
PREPROCESSING_PARITY_REPORT.md
```

Classify:

```text
VERIFIED
PARTIALLY VERIFIED
FAILED
BLOCKED
```

---

# 8. PHASE 4 — NODE vs PYTHON ONNX RUNTIME PARITY

Run the exact same model and same preprocessed tensor through:

### Runtime A

```text
Node.js + onnxruntime-node
```

### Runtime B

```text
Python + onnxruntime
```

Use identical:

```text
model hash
input tensor
input name
input shape
dtype
```

Compare:

```text
raw logits
softmax probabilities
predicted class
confidence
referable probability
```

Use an explicit float32 tolerance.
Do not compare only rounded percentages.

Create:

```text
NODE_PYTHON_ONNX_PARITY.json
```

If outputs materially disagree:

```text
STOP
→ inspect preprocessing
→ inspect channel order
→ inspect normalization
→ inspect input binding
→ inspect output binding
→ inspect runtime versions
```

Do not proceed as though parity exists.

---

# 9. PHASE 5 — POSTPROCESSING VALIDATION

Validate:

```text
logits
↓
softmax
↓
probabilities
↓
argmax
↓
DR grade
```

Verify:

```text
sum(probabilities) ≈ 1
argmax(probabilities) == drGradeCode
```

Verify class mapping exactly matches the frozen contract:

```text
0 → No Apparent DR
1 → Mild NPDR
2 → Moderate NPDR
3 → Severe NPDR
4 → PDR
```

Create:

```text
POSTPROCESSING_VALIDATION.md
```

---

# 10. PHASE 6 — REFERABLE DR LOGIC

Validate the binary mapping used by the screening system:

```text
0–1 → non-referable
2–4 → referable
```

Test each class explicitly.

Do not infer referability from confidence.
Do not change the mapping to improve screening metrics.

Create:

```text
REFERABLE_LOGIC_VALIDATION.md
```

---

# 11. PHASE 7 — DETERMINISM

Run the same image through the exact same inference path at least five times where practical.

Record:

```text
logits
probabilities
grade
confidence
referable
runtime
```

Expected:

```text
same model
+
same image
+
same preprocessing
+
same runtime configuration
→
same prediction
```

If numerical drift exists, quantify it and determine whether it is acceptable or indicative of a defect.

Create:

```text
ONNX_DETERMINISM_REPORT.md
```

---

# 12. PHASE 8 — ANALYSIS SERVICE INTEGRATION

Trace:

```text
ONNX adapter
↓
AnalysisService
↓
Database
```

Verify persistence of:

```text
dr_grade_code
grade_probabilities
referable_probability
analysis status
model version
abstention fields
stage timings
```

Verify:

```text
completed inference
≠
abstained inference
```

Deliberately selecting mock mode must continue to produce the safe abstention path.

---

# 13. PHASE 9 — UNIFIED API

For a real ONNX-generated case, execute:

```http
GET /api/v1/case/:case_uuid
```

Verify that the response contains the established prediction contract and the real persisted values.

Do not invent fields solely for this test. Follow the repository's actual API contract.

Verify API state equals database analysis state.

---

# 14. PHASE 10 — FRONTEND MODEL OUTPUT PATH

Trace:

```text
GET /api/v1/case/:case_uuid
        ↓
API client
        ↓
casesService / analysisService
        ↓
React state
        ↓
AiAnalysis.tsx
        ↓
ResultPanel
```

Search for:

```text
mock
dummy
demo
fallback
hardcoded
abstain
No grade issued
```

Determine whether any fallback can silently replace a real ONNX result.

Every rendered prediction must be traceable to actual inference output.

---

# 15. PHASE 11 — REAL ONNX END-TO-END

Execute the complete technical path:

```text
Technician
↓
Image
↓
Case creation
↓
Quality gate
↓
ONNX inference
↓
Analysis persistence
↓
GET /api/v1/case/:case_uuid
↓
Frontend
↓
Rendered grade/confidence
```

Capture:

```text
case_uuid
model hash
image identifier
inference result
API response
frontend evidence
logs
timings
```

Create:

```text
REAL_ONNX_END_TO_END_REPORT.md
```

Call this:

```text
TECHNICAL MODEL-INTEGRATION E2E
```

unless an independent clinical validation protocol exists.

---

# 16. PHASE 12 — VALIDATION DATASET

Determine whether a valid labeled validation dataset is actually available.

Acceptable sources may include:

```text
APTOS validation/holdout
approved local labeled validation set
documented independent holdout set
other authorized labeled dataset
```

Do not treat training data as a generalization validation set.

Record:

```text
dataset source
number of images
class distribution
label provenance
patient-level separation if known
preprocessing
inclusion/exclusion
```

If no valid labeled dataset is available:

```text
MODEL PERFORMANCE VALIDATION = BLOCKED
```

---

# 17. PHASE 13 — MODEL PERFORMANCE VALIDATION

Only if a valid labeled dataset exists, compute:

### Multiclass

```text
accuracy
macro precision
macro recall
macro F1
weighted F1
confusion matrix
QWK if required
```

### Referable DR

Define:

```text
referable = grade 2,3,4
non-referable = grade 0,1
```

Compute:

```text
TP
TN
FP
FN
sensitivity
specificity
PPV
NPV
```

Every metric must state:

```text
dataset
population
N
class distribution
protocol
confidence interval if calculated
```

Do not compare deployment metrics to historical metrics without stating the evaluation population and protocol.

---

# 18. PHASE 14 — DECISION / ABSTENTION POLICY

Determine whether the real ONNX path uses:

```text
argmax
confidence threshold
referable threshold
abstention threshold
```

Record exact values and source.

Do not invent thresholds.

If an abstention policy exists, test it explicitly:

```text
input
→ model output
→ confidence/policy
→ classify OR abstain
```

Do not tune thresholds in this validation phase merely to improve metrics.

---

# 19. PHASE 15 — RUNTIME PERFORMANCE

Measure actual:

```text
session initialization
first inference
warm inference
median inference
P95 inference if sample size permits
```

Separate:

```text
preprocessing
inference
postprocessing
total
```

Do not present one sample timing as production performance.

---

# 20. PHASE 16 — FAILURE MODES

Test:

```text
invalid image
missing image
corrupt image
unsupported format
wrong dimensions
missing model
corrupt model
session init failure
inference failure
unexpected output shape
NaN/Inf output
malformed output
```

Expected:

```text
controlled failure
+
truthful status
+
safe API response
+
no fabricated grade
+
appropriate logs
```

---

# 21. PHASE 17 — MODEL ARTIFACT TRACEABILITY

Every inference evidence record must identify:

```text
model filename
SHA-256
model version
runtime
adapter
preprocessing version
input image identifier
timestamp
```

This prevents stale model evidence from being presented as current evidence.

---

# 22. PHASE 18 — REGRESSION

Run:

```bash
npm run test
```

plus all ONNX-specific tests.

Verify that:

```text
Engineer-2 tests remain green
integration contracts remain green
review flow remains green
offline tests remain green
security tests remain green
```

No ONNX change may silently regress the frozen system.

---

# 23. PHASE 19 — MATLAB BOUNDARY

Do not remove MATLAB support solely because Node ONNX works.

Document:

```text
Primary web inference:
Node + ONNX Runtime

MATLAB/Simulink path:
separate adapter / compatibility path
```

Do not claim MATLAB integration is verified unless the MATLAB path itself is directly exercised.

The existence of MATLAB on the host does not prove MATLAB inference integration.

---

# 24. PHASE 20 — CLEAN-ROOM REPRODUCTION

Reproduce model execution from clean state.

Verify:

```text
dependencies
model artifact
model hash
configuration
preprocessing
ONNX Runtime
single inference
API integration
frontend integration
```

No hidden cache, developer-only package, stale model, or undocumented environment variable may be required.

---

# 25. PHASE 21 — EVIDENCE REGISTER

Create:

```text
ONNX_VALIDATION_EVIDENCE_REGISTER.json
```

Recommended IDs:

```text
ONNX-001 Baseline
ONNX-002 Model Forensics
ONNX-003 Training Contract
ONNX-004 Preprocessing Parity
ONNX-005 Node/Python Runtime Parity
ONNX-006 Postprocessing
ONNX-007 Referable Logic
ONNX-008 Determinism
ONNX-009 Analysis Persistence
ONNX-010 API Exposure
ONNX-011 Frontend Receipt
ONNX-012 Real ONNX E2E
ONNX-013 Validation Dataset
ONNX-014 Model Performance
ONNX-015 Decision/Threshold Policy
ONNX-016 Runtime Performance
ONNX-017 Failure Handling
ONNX-018 Artifact Traceability
ONNX-019 Regression
ONNX-020 MATLAB Boundary
ONNX-021 Clean Room
ONNX-022 Final Release Gate
```

Each evidence item should include:

```json
{
  "id": "ONNX-XXX",
  "claim": "",
  "source": "",
  "command": "",
  "artifact": "",
  "model_sha256": "",
  "result": "",
  "status": "",
  "confidence": "",
  "limitations": ""
}
```

Never create evidence for a test that was not executed.

---

# 26. REQUIRED REPORTS

Create:

```text
ONNX_VALIDATION_REPORT.md
ONNX_VALIDATION_EVIDENCE_REGISTER.json
PREPROCESSING_PARITY_REPORT.md
NODE_PYTHON_ONNX_PARITY.json
ONNX_DETERMINISM_REPORT.md
REFERABLE_LOGIC_VALIDATION.md
REAL_ONNX_END_TO_END_REPORT.md
```

Only create a model-performance section with metrics if a valid labeled evaluation dataset exists.

---

# 27. FINAL CLASSIFICATION

Use exactly one:

## TECHNICALLY INTEGRATED

ONNX inference executes and technical API/frontend integration works, but performance validation is incomplete or unavailable.

## TECHNICALLY VALIDATED

ONNX inference, preprocessing parity, runtime parity, end-to-end integration, determinism, and failure handling are directly verified.

## MODEL PERFORMANCE VALIDATED

Technical validation is complete AND an appropriate labeled validation dataset has been evaluated with a documented protocol.

## BLOCKED

A required runtime, model, dataset, or dependency prevents validation.

## FAILED

A critical technical integration or validation requirement fails.

Do not equate any of these with clinical validation or regulatory approval.

---

# 28. HARD STOP CONDITIONS

Stop and report `FAILED` or `BLOCKED` if:

- Node preprocessing materially differs from training preprocessing;
- Node and independent ONNX Runtime outputs materially disagree;
- class mapping is inconsistent;
- API persists incorrect model output;
- frontend displays stale/fake values;
- model output cannot be traced to a specific model hash;
- invalid inference creates a fabricated grade;
- missing/corrupt model causes false success;
- the validation dataset is inadequate for the claimed performance;
- ONNX integration breaks the frozen Engineer-2 contract;
- regression introduces an unexplained critical failure.

---

# 29. FINAL REPORT

Create:

```text
ONNX_VALIDATION_REPORT.md
```

Required structure:

```md
# RetinaGuard — ONNX Validation Report

## 1. Executive Summary
## 2. Model Artifact
## 3. Training Contract
## 4. Preprocessing Parity
## 5. Node/Python Runtime Parity
## 6. Postprocessing
## 7. Referable DR Logic
## 8. Determinism
## 9. Analysis Persistence
## 10. API Exposure
## 11. Frontend Integration
## 12. Real ONNX End-to-End
## 13. Validation Dataset
## 14. Model Performance
## 15. Decision/Threshold Policy
## 16. Runtime Performance
## 17. Failure Handling
## 18. Artifact Traceability
## 19. Regression
## 20. MATLAB Boundary
## 21. Clean-Room Reproduction
## 22. Evidence Register
## 23. Limitations
## 24. Clinical-Validation Boundary
## 25. Final Classification
```

---

# 30. FINAL OUTPUT CONTRACT

At completion return:

```text
RETINAGUARD — ONNX VALIDATION

Model:
SHA-256:
Runtime:
Adapter:

Preprocessing Parity:
PASS / FAIL / BLOCKED

Node/Python Parity:
PASS / FAIL / BLOCKED

Postprocessing:
PASS / FAIL / BLOCKED

Referable Logic:
PASS / FAIL / BLOCKED

Determinism:
PASS / FAIL / BLOCKED

Analysis Persistence:
PASS / FAIL / BLOCKED

API:
PASS / FAIL / BLOCKED

Frontend:
PASS / FAIL / BLOCKED

Real ONNX E2E:
PASS / FAIL / BLOCKED

Validation Dataset:
AVAILABLE / UNAVAILABLE

Model Performance:
VALIDATED / NOT VALIDATED / BLOCKED

Performance:
MEASURED / NOT MEASURED

Failure Handling:
PASS / FAIL / BLOCKED

Regression:
PASS / FAIL / BLOCKED

Clean Room:
PASS / FAIL / BLOCKED

MATLAB Boundary:
DOCUMENTED / VERIFIED / BLOCKED

Final Classification:
```

---

# 31. FINAL EXECUTION ORDER

Execute exactly in this order:

```text
1. Baseline
        ↓
2. Model forensics
        ↓
3. Training contract
        ↓
4. Preprocessing parity
        ↓
5. Node/Python parity
        ↓
6. Postprocessing
        ↓
7. Referable logic
        ↓
8. Determinism
        ↓
9. Analysis persistence
        ↓
10. API exposure
        ↓
11. Frontend integration
        ↓
12. Real ONNX E2E
        ↓
13. Validation dataset
        ↓
14. Model-performance validation if dataset exists
        ↓
15. Threshold policy
        ↓
16. Runtime performance
        ↓
17. Failure injection
        ↓
18. Artifact traceability
        ↓
19. Regression
        ↓
20. MATLAB boundary
        ↓
21. Clean room
        ↓
22. Evidence register
        ↓
23. Final report
        ↓
24. Final classification
```

---

# 32. FINAL PRINCIPLE

The objective is NOT:

> “The model runs.”

The objective is:

> **The exact trained model artifact is executed with training-consistent preprocessing, produces numerically consistent results across runtimes, is correctly persisted and exposed by the backend, is correctly rendered by the frontend, behaves deterministically, fails safely, and—only where a valid labeled dataset exists—has its performance measured using an explicit and reproducible protocol.**

Never manufacture model performance.
Never confuse technical inference with clinical validation.
Never change the model merely to make metrics look better.

**Verify the model. Verify the pipeline. Verify the evidence.**

---

# END OF ENGINEER 3 ONNX VALIDATION MASTER PROMPT
