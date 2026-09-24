# RetinaGuard — Real ONNX Inference Integration
## Anti-Gravity / BMPv2 Master Execution Prompt
### Engineer 3 · Model Runtime Integration · Backend → API → Frontend
### Input: Frozen Engineer-2 + Frozen Integration Release Candidate

---

# 0. MISSION

You are Engineer 3, acting as a Principal ML Inference Engineer, Backend Integration Engineer, and Production AI Runtime Engineer.

Your mission is to replace the **intentional mock/abstention inference path** with the actual exported RetinaGuard ResNet-18 ONNX model while preserving all existing Engineer-2 and Integration contracts.

The current forensic state is:

```text
MATLAB_ADAPTER=mock
        ↓
mockAdapter.modelIntegrated=false
        ↓
MODEL_NOT_INTEGRATED
        ↓
abstained=true
        ↓
dr_grade_code=null
        ↓
"No grade issued — automated screening abstained"
```

That safety behavior is currently correct.

The task is NOT to suppress the abstention.

The task is to create a real, traceable inference path:

```text
Fundus Image
      ↓
Training-Matched Preprocessing
      ↓
ONNX Runtime
      ↓
ResNet-18
      ↓
Raw Outputs / Logits
      ↓
Postprocessing
      ↓
DR Grade 0–4
      ↓
Confidence
      ↓
5-Class Probabilities
      ↓
Canonical Analysis Contract
      ↓
Database
      ↓
GET /api/v1/case/:case_uuid
      ↓
React Frontend
      ↓
Actual Grade / Confidence / Probabilities
```

The final technical objective is:

> **A real ONNX model execution path that produces reproducible inference results and feeds them through the existing backend/API/frontend contracts without weakening clinical safety or introducing fabricated outputs.**

---

# 1. CURRENT PROJECT BASELINE

The current repository contains a model workspace resembling:

```text
model/
├── datasets/
├── RetinaGuard_ML/
├── retinaguard_resnet18.onnx
├── train_baseline.py
├── train_modal.py
├── upload_*.py
└── additional training/project artifacts
```

The frozen backend is:

```text
retinaguard-backend/
```

Existing frontend:

```text
RetinaGuard-Frontend-v3/
```

The existing Engineer-2 and Integration phases are frozen.

Do NOT redesign them.

---

# 2. NON-NEGOTIABLE ARCHITECTURAL BOUNDARY

The frontend already works against the existing unified API.

Do NOT change the public API simply to accommodate ONNX.

The desired architecture is:

```text
React
   ↓
Existing /api/v1 + analysis endpoints
   ↓
Existing Analysis Service
   ↓
Inference Service / Adapter Boundary
   ↓
ONNX Adapter
   ↓
ONNX Runtime Node
   ↓
retinaguard_resnet18.onnx
```

The ONNX adapter must be replaceable by:

```text
Mock Adapter
MATLAB Adapter
ONNX Adapter
```

without forcing the frontend to know which adapter is active.

---

# 3. CRITICAL SAFETY RULES

## 3.1 Never fabricate clinical predictions

Do NOT:

- hardcode a DR grade;
- hardcode confidence;
- manufacture probabilities;
- modify the frontend to display fake predictions;
- remove abstention only to make the UI look complete;
- replace missing model output with demo values;
- reuse an unrelated previous model output;
- silently convert errors into grades.

---

## 3.2 Never change model semantics without evidence

Do NOT guess:

- image normalization;
- RGB/BGR ordering;
- channel ordering;
- tensor layout;
- mean/std;
- crop strategy;
- model input name;
- model output meaning;
- class ordering;
- thresholding;
- postprocessing.

Derive these from authoritative sources:

```text
ONNX graph metadata
+
training code
+
export code
+
existing model documentation
```

If the evidence is insufficient, mark it:

```text
UNKNOWN
```

and stop that implementation step until resolved.

---

# 4. MODEL AUTHORITY CHAIN

Treat model semantics according to this hierarchy:

```text
1. ONNX graph itself
2. Model export code
3. Training code actually used to produce the ONNX artifact
4. Frozen model documentation
5. Previous project reports
6. General ML assumptions
```

Do not substitute generic ImageNet preprocessing merely because ResNet-18 commonly uses it.

---

# 5. PHASE 0 — BASELINE SNAPSHOT

Before modifying code, record:

```text
Git commit
Git status
Node version
NPM version
Python version
onnxruntime-node version if installed
Existing ONNX model path
ONNX file size
ONNX SHA-256
MATLAB adapter state
Current inference engine configuration
Current regression result
```

Create:

```text
ONNX_INTEGRATION_BASELINE.md
```

Record whether the working tree is clean.

---

# 6. PHASE 1 — MODEL ARTIFACT FORENSICS

DO NOT immediately code the adapter.

First inspect the ONNX model.

Determine:

```text
Model IR version
Opset version
Input names
Input shapes
Input datatype
Input layout
Output names
Output shapes
Output datatype
Dynamic/static dimensions
Model metadata
Producer framework
```

Use ONNX Runtime or ONNX tooling.

Create:

```text
ONNX_MODEL_INSPECTION.json
```

Example conceptual structure:

```json
{
  "model": "retinaguard_resnet18.onnx",
  "sha256": "",
  "inputs": [],
  "outputs": [],
  "opset": "",
  "producer": "",
  "metadata": {}
}
```

Do not invent missing metadata.

---

# 7. PHASE 2 — TRAINING PIPELINE FORENSICS

Inspect the actual training/export source associated with:

```text
train_baseline.py
train_modal.py
```

Determine:

```text
image size
resize method
crop behavior
color order
tensor layout
dtype
normalization
mean
std
augmentation used during training
class mapping
class index ordering
output interpretation
export assumptions
```

Explicitly identify:

```text
TRAINING PREPROCESSING
vs
INFERENCE PREPROCESSING
```

The inference path must reproduce the model's expected inference preprocessing.

Do not copy augmentation into production inference unless the model explicitly requires it.

---

# 8. PHASE 3 — CLASS MAPPING FORENSICS

The system has 5 DR classes:

```text
0 = No DR
1 = Mild
2 = Moderate
3 = Severe
4 = Proliferative DR
```

However, **do not assume this is the ONNX output ordering without evidence**.

Prove the mapping from:

```text
training label encoding
→ class index
→ ONNX output index
→ backend severity code
→ frontend label
```

Create:

```text
MODEL_CLASS_MAPPING.md
```

Required table:

| Model Index | Backend Grade | Clinical Label | Evidence |
|---:|---:|---|---|
| 0 | | | |
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |

If ordering cannot be proven:

```text
CLASS_MAPPING = UNVERIFIED
```

Do not integrate the output as clinical grade.

---

# 9. PHASE 4 — IMAGE PREPROCESSING CONTRACT

Create a dedicated preprocessing module.

Recommended logical location:

```text
retinaguard-backend/src/inference/preprocess.js
```

or an equivalent location consistent with the existing repository.

Responsibilities:

```text
read image
→ validate image
→ resize according to training/export contract
→ convert RGB
→ normalize
→ float32
→ tensor layout
→ validate shape
```

The preprocessing module MUST expose enough metadata for debugging:

```text
input width
input height
channels
dtype
tensor shape
preprocessing version
```

Do not include raw image data in logs.

---

# 10. PHASE 5 — ONNX RUNTIME ADAPTER

Create:

```text
retinaguard-backend/src/inference/adapters/onnxAdapter.js
```

The adapter must expose a stable interface compatible with the existing inference abstraction.

Conceptual contract:

```js
class OnnxAdapter {
  async health() {}
  async infer(imagePath, context = {}) {}
}
```

Do not make controllers instantiate `onnxruntime-node` directly.

The adapter owns:

```text
session management
model loading
preprocessing
inference
postprocessing
runtime errors
timing
model metadata
```

---

# 11. PHASE 6 — MODEL SESSION MANAGEMENT

Do NOT load the ONNX model from disk for every image unless there is a demonstrated reason.

Preferred lifecycle:

```text
Application Start
       ↓
Validate Model Artifact
       ↓
Create ONNX Session
       ↓
Health = READY
       ↓
Reuse Session
       ↓
Inference Requests
```

Handle:

```text
missing model
corrupt model
invalid graph
unsupported operator
runtime initialization failure
```

Expected behavior:

```text
inference unavailable
+
explicit error
+
no fabricated prediction
```

---

# 12. PHASE 7 — MODEL HEALTH

The inference adapter must expose a health signal.

Example conceptual state:

```text
INITIALIZING
READY
DEGRADED
FAILED
```

Expose actual information where appropriate:

```text
adapter = onnx
model_version
model hash
session state
runtime version
```

Do not expose local filesystem paths publicly if unnecessary.

---

# 13. PHASE 8 — FIRST REAL INFERENCE

Before connecting the frontend, run the ONNX adapter directly against a controlled test image.

Verify:

```text
image
→ preprocessing
→ tensor
→ ONNX session
→ raw output
→ postprocessing
→ grade
→ probabilities
→ confidence
```

Capture:

```text
input fixture ID
model hash
input shape
output shape
raw output summary
final prediction
runtime
```

Create:

```text
ONNX_SINGLE_INFERENCE_EVIDENCE.json
```

Do not alter the prediction manually.

---

# 14. PHASE 9 — OUTPUT INTERPRETATION

Determine what the ONNX model actually emits.

It may emit:

```text
logits
probabilities
scores
class IDs
```

Do NOT assume.

Inspect the output tensor(s).

If logits:

```text
logits
→ numerically stable softmax
→ probabilities
```

Then:

```text
argmax(probabilities)
→ predicted class
```

Confidence must have an explicit definition.

For a standard classifier, confidence may be:

```text
max(probabilities)
```

ONLY if this interpretation matches the project's intended contract.

Do not invent a clinical confidence metric.

---

# 15. PHASE 10 — PROBABILITY VALIDATION

For each inference verify:

```text
5 probability values
```

where the model is confirmed to be a 5-class classifier.

Validate:

```text
all finite
0 ≤ p ≤ 1
sum approximately 1
```

Use a documented numerical tolerance.

If the model output is not probabilities, explicitly convert it.

Record:

```text
raw output
postprocessed probabilities
predicted index
confidence
```

---

# 16. PHASE 11 — ANALYSIS SERVICE INTEGRATION

The existing analysis service must remain the business workflow authority.

Target:

```text
analysisService
      ↓
InferenceService
      ↓
ONNX Adapter
```

NOT:

```text
analysisService
      ↓
direct filesystem/model logic
```

The resulting analysis object should preserve the existing canonical fields.

At minimum inspect:

```text
status
abstained
abstain_reason
dr_grade_code
confidence
grade_probabilities
model_version
timings
```

Use the existing schema where available.

Do not invent parallel fields.

---

# 17. PHASE 12 — DATABASE PERSISTENCE

Run a real inference and verify the database record.

Confirm:

```text
analysis status = completed
abstained = false
dr_grade_code = valid model-mapped grade
grade_probabilities = 5 values
model_version = correct
created_at / completed_at
```

If the analysis fails:

```text
status = failed/appropriate failure state
no fabricated grade
no fabricated confidence
```

---

# 18. PHASE 13 — UNIFIED CASE API

After persistence:

```http
GET /api/v1/case/:case_uuid
```

Verify the existing schema exposes the actual result, including where applicable:

```json
{
  "prediction": {
    "grade": "...",
    "label": "...",
    "confidence": "...",
    "referable": "..."
  },
  "probabilities": [],
  "stage_timings_ms": {},
  "explanation": {}
}
```

Use the existing schema exactly.

Do not modify the public contract unless a genuine contract defect is proven.

---

# 19. PHASE 14 — FRONTEND MODEL-TO-UI TRACE

Trace:

```text
ONNX output
↓
analysisService
↓
database
↓
GET /api/v1/case/:case_uuid
↓
api.ts
↓
AiAnalysis.tsx
↓
ResultPanel
↓
UI
```

The frontend must show the actual backend result.

Search for and eliminate only if they are active production paths:

```text
mock analysis
demo analysis
hardcoded grade
hardcoded confidence
fallback grade
fallback probabilities
```

Do NOT remove legitimate fallback/abstention safety behavior.

---

# 20. PHASE 15 — REAL MODEL UI VALIDATION

With:

```env
INFERENCE_ENGINE=onnx
MODEL_VERSION=retinaguard_resnet18.onnx
```

execute:

```text
Create case
↓
Upload image
↓
Run analysis
↓
GET /api/v1/case/:case_uuid
↓
Frontend
```

Expected technical result, if the model/runtime is valid:

```text
analysis completed
+
abstained = false
+
grade present
+
confidence present
+
5 probabilities
```

If the model/runtime fails:

```text
FAIL
```

not fake success.

---

# 21. PHASE 16 — GOLDEN MODEL FIXTURES

Create a deterministic model integration fixture set.

Minimum:

```text
fixture_valid_01
fixture_valid_02
fixture_valid_03
```

For each record:

```text
image hash
model hash
preprocessing version
expected output shape
actual output shape
predicted class
probabilities
runtime
```

Do NOT create fake expected clinical labels merely to make tests pass.

If expected labels are not independently established, use:

```text
shape/schema/determinism assertions
```

and clearly separate those from clinical correctness.

---

# 22. PHASE 17 — DETERMINISM TEST

Run the same exact input multiple times.

Verify:

```text
same model
+
same preprocessing
+
same image
+
same runtime
→
same or numerically equivalent output
```

Measure any numerical variation.

Do not claim strict bitwise identity unless actually observed.

---

# 23. PHASE 18 — PERFORMANCE MEASUREMENT

Measure actual inference latency.

Separate:

```text
image load
preprocessing
ONNX session execution
postprocessing
database persistence
total analysis time
```

Record:

```text
N
min
median
P95
max
```

Do not invent benchmarks.

Do not confuse design targets with measured values.

---

# 24. PHASE 19 — FAILURE TESTS

Test:

```text
missing model
corrupted model
invalid image
wrong dimensions
unsupported image format
inference runtime failure
malformed output
unexpected tensor shape
NaN/Infinity output
```

Expected:

```text
safe failure
+
no fabricated clinical result
+
observable error
+
case remains recoverable
```

---

# 25. PHASE 20 — SECURITY / MODEL ARTIFACT

Verify:

- model file is not user-uploadable;
- model path is server-controlled;
- path traversal cannot select arbitrary model files;
- model artifact hash is recorded;
- model cannot be silently replaced by uploaded content;
- model metadata is not falsified by frontend input.

---

# 26. PHASE 21 — MATLAB ROLE

Do NOT make MATLAB mandatory for the primary web inference path unless an authoritative requirement explicitly requires it.

Recommended separation:

```text
ONNX
→ primary production inference

MATLAB
→ optional integration / validation / Simulink pathway

MOCK
→ deterministic testing only
```

If MATLAB remains an integration requirement, preserve its adapter interface.

Do NOT claim MATLAB inference works simply because MATLAB is installed.

Actual MATLAB execution must be independently validated.

---

# 27. PHASE 22 — GRAD-CAM BOUNDARY

Do NOT implement Grad-CAM inside this task unless required and technically justified.

First establish:

```text
real model inference
+
correct predictions
+
correct API integration
```

Then handle explainability as a separate controlled layer.

Do not generate fake heatmaps.

Do not reuse stale Grad-CAM artifacts.

If Grad-CAM is later implemented, it must correspond to:

```text
same model
same image
same prediction
same case
```

---

# 28. PHASE 23 — FULL END-TO-END MODEL VALIDATION

Execute:

```text
Frontend
↓
Case Creation
↓
Image
↓
Quality
↓
Analysis
↓
ONNX Runtime
↓
Database
↓
GET /api/v1/case/:uuid
↓
Frontend
↓
Displayed Grade
↓
Reviewer
↓
Report
```

Capture evidence at every boundary.

Create:

```text
REAL_MODEL_E2E_EVIDENCE.md
```

---

# 29. PHASE 24 — MOCK VS REAL REGRESSION

Verify both modes.

## MOCK

```env
INFERENCE_ENGINE=mock
```

Expected:

```text
safe deterministic mock behavior
```

## ONNX

```env
INFERENCE_ENGINE=onnx
```

Expected:

```text
actual model execution
```

The frontend/API contract should remain stable across both.

---

# 30. PHASE 25 — REGRESSION

Run:

```bash
npm run test
```

Then run ONNX-specific tests.

Verify:

- existing Engineer-2 tests remain green;
- Integration tests remain green;
- ONNX tests pass;
- no regression in reviewer flow;
- no regression in offline flow;
- no regression in API contract;
- no regression in clinical safety.

Do not modify existing tests simply to hide model-integration failures.

---

# 31. PHASE 26 — CLEAN-ROOM MODEL DEPLOYMENT

Perform a clean model integration environment.

Verify:

```text
fresh install
+
model artifact
+
configuration
+
database
+
backend
+
frontend
```

Then run:

```text
health
→ model health
→ single inference
→ full E2E
```

No hidden local Python environment should be required if production is Node/ONNX Runtime.

---

# 32. PHASE 27 — EVIDENCE REGISTER

Create/update:

```text
ONNX_INTEGRATION_EVIDENCE_REGISTER.json
```

Recommended IDs:

```text
ONNX-001 Baseline
ONNX-002 Model Inspection
ONNX-003 Training Preprocessing
ONNX-004 Class Mapping
ONNX-005 Preprocessing Unit Test
ONNX-006 Session Initialization
ONNX-007 Model Health
ONNX-008 Single Inference
ONNX-009 Postprocessing
ONNX-010 Probability Validation
ONNX-011 Database Persistence
ONNX-012 Unified API
ONNX-013 Frontend Receipt
ONNX-014 UI Rendering
ONNX-015 Determinism
ONNX-016 Performance
ONNX-017 Failure Handling
ONNX-018 Mock Regression
ONNX-019 ONNX Regression
ONNX-020 Clean Room
ONNX-021 Full Model E2E
ONNX-022 Final Gate
```

Each record should contain:

```json
{
  "id": "ONNX-001",
  "category": "",
  "claim": "",
  "source": "",
  "command": "",
  "artifact": "",
  "expected": "",
  "observed": "",
  "result": "",
  "status": "",
  "confidence": "",
  "limitations": ""
}
```

---

# 33. PHASE 28 — MODEL TRACEABILITY MATRIX

Create:

```text
ONNX_MODEL_TRACEABILITY_MATRIX.md
```

Include:

| Requirement | Model Artifact | Preprocessing | Adapter | Test | Runtime Evidence | Result |
|---|---|---|---|---|---|---|

Critical claims must be traceable.

---

# 34. PHASE 29 — FINAL REPORT

Create:

```text
ONNX_INTEGRATION_REPORT.md
```

Required sections:

```text
1. Executive Summary
2. Model Artifact
3. Model Graph Inspection
4. Training/Export Contract
5. Preprocessing
6. Class Mapping
7. ONNX Adapter
8. Runtime Session
9. Postprocessing
10. Database Persistence
11. Unified API
12. Frontend Integration
13. Mock vs ONNX Modes
14. Failure Handling
15. Performance
16. Determinism
17. Clean Room
18. Regression
19. MATLAB Boundary
20. Explainability Boundary
21. Evidence Register
22. Known Limitations
23. Real Inference Status
24. Final Decision
```

---

# 35. FINAL CLASSIFICATION

Use exactly one:

### `ONNX INTEGRATION VERIFIED`

Use only if:

```text
real ONNX model executed
+
correct preprocessing verified
+
correct output interpretation verified
+
database persistence verified
+
API exposure verified
+
frontend rendering verified
+
failure paths verified
+
regression passes
+
clean-room reproduction passes
```

### `ONNX INTEGRATION PARTIALLY VERIFIED`

Use when technical execution works but a critical integration boundary remains unproven.

### `ONNX INTEGRATION BLOCKED`

Use when a required model/runtime dependency is unavailable or model semantics cannot be established.

### `ONNX INTEGRATION FAILED`

Use when the actual runtime exists but model execution/integration fails.

### `EVIDENCE INSUFFICIENT`

Use when evidence cannot support the requested conclusion.

---

# 36. HARD STOP CONDITIONS

Stop immediately if:

```text
model artifact cannot be loaded
model input contract is unknown
class mapping is unknown
preprocessing is guessed
model output is fabricated
frontend displays hardcoded clinical output
API output differs unexpectedly from persisted analysis
NaN/Infinity output is accepted as valid
wrong model version is loaded
model artifact can be replaced through user input
mock and ONNX behavior are indistinguishable
clinical claims are fabricated
existing Engineer-2 contract is broken
existing integration tests regress
```

---

# 37. IMPORTANT DISTINCTION

The following are different claims:

```text
ONNX FILE EXISTS
        ≠
ONNX FILE LOADS

ONNX FILE LOADS
        ≠
MODEL PRODUCES OUTPUT

MODEL PRODUCES OUTPUT
        ≠
OUTPUT IS INTERPRETED CORRECTLY

CORRECT OUTPUT
        ≠
API INTEGRATION

API INTEGRATION
        ≠
FRONTEND RENDERING

TECHNICAL INFERENCE
        ≠
CLINICAL VALIDATION
```

Maintain these distinctions in every report.

---

# 38. FINAL COMMAND

Begin with:

```text
PHASE 0 — BASELINE SNAPSHOT
```

Then proceed sequentially.

Do not begin by editing `analysisService.js`.

First inspect:

```text
ONNX graph
training pipeline
export path
input/output contract
class mapping
```

Then implement the adapter.

The correct dependency order is:

```text
MODEL FORENSICS
        ↓
TRAINING CONTRACT
        ↓
CLASS MAPPING
        ↓
PREPROCESSING
        ↓
ONNX SESSION
        ↓
RAW INFERENCE
        ↓
POSTPROCESSING
        ↓
ANALYSIS SERVICE
        ↓
DATABASE
        ↓
UNIFIED API
        ↓
FRONTEND
        ↓
FULL E2E
        ↓
REGRESSION
        ↓
CLEAN ROOM
        ↓
FINAL EVIDENCE
```

**Do not skip directly from `retinaguard_resnet18.onnx` to the frontend.**

The objective is:

> **Make the real model executable, scientifically traceable, technically reproducible, and safely integrated into the existing RetinaGuard system without changing the established API or falsifying clinical output.**

**Execute.**
