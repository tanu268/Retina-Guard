# RetinaGuard — Python Environment Fix + Preprocessing Parity Remediation & Re-validation
## Anti-Gravity Master Execution Prompt
### SIH 2026 · RetinaGuard Backend
### Phase: Environment Unblocking → Preprocessing Parity Remediation → Re-validation

---

# 0. MISSION

You are operating as the **RetinaGuard Preprocessing Parity Remediation & Re-validation Engineer**.

Before continuing the preprocessing investigation, the Python validation environment must be made runnable and reproducible.

The current editor shows these errors in:

```text
retinaguard-backend/scripts/export_tensor.py
retinaguard-backend/scripts/verify_inference.py
retinaguard-backend/scripts/verify_preprocessing.py
```

with:

```text
Cannot find module 'src.preprocessing'
Pylance / missing-import
```

The immediate objective is therefore:

```text
1. Diagnose and fix the Python import/environment problem
2. Verify the Python preprocessing implementation can actually execute
3. Reconstruct the authoritative training preprocessing pipeline
4. Make Node deployment preprocessing numerically equivalent to training preprocessing
5. Re-run end-to-end ONNX parity validation
6. Produce auditable evidence
```

Do not skip the environment repair and do not proceed by assuming that the IDE warning is harmless.

---

# 1. IMPORTANT DIAGNOSTIC RULE

The visible error:

```text
Cannot find module 'src.preprocessing'
```

does **not automatically prove** that a third-party Python package is missing.

It can be caused by any of these:

```text
A. Missing third-party dependency
B. Wrong Python interpreter selected
C. Virtual environment not created/activated
D. Dependencies not installed
E. Local module src/preprocessing.py does not exist
F. src is not recognized as an importable package
G. Project root is not on PYTHONPATH
H. VS Code / Pylance import path configuration is wrong
I. Script is being executed from the wrong working directory
J. The source tree and import statement are inconsistent
```

You must determine the actual cause from the repository.

Do NOT blindly install packages until the repository structure and import failure are understood.

---

# 2. OPERATING PRINCIPLES

## 2.1 Preserve working behavior

Do not rewrite working backend inference code merely to make the editor warning disappear.

## 2.2 Do not fabricate dependencies

Do not add arbitrary packages simply because they are common in computer-vision projects.

Install only dependencies actually required by:

```text
training code
preprocessing code
validation scripts
ONNX validation
repository configuration
```

## 2.3 Use the repository as the source of truth

Inspect:

```text
requirements.txt
requirements-dev.txt
pyproject.toml
setup.py
setup.cfg
Pipfile
environment.yml
README files
training scripts
preprocessing modules
validation scripts
```

If multiple dependency manifests exist, determine which one is authoritative and document that decision.

## 2.4 Do not change the model

Do not modify:

```text
retinaguard_resnet18.onnx
```

The canonical ONNX model remains:

```text
SHA-256:
C49E78C9B6C7BFA5B0098BD40A3901D02C7B41C9598CAC993891B29263476F3F
```

Any model-hash change is a STOP condition and requires a separate validation cycle.

---

# 3. STEP 1 — FORENSICALLY INSPECT THE PYTHON PROJECT

Before installing anything, inspect the repository.

Find:

```text
src/
src/preprocessing.py
src/preprocessing/
scripts/export_tensor.py
scripts/verify_inference.py
scripts/verify_preprocessing.py
training preprocessing implementation
dataset.py
train_baseline.py
```

Also inspect all imports beginning with:

```python
from src.
import src.
```

Create:

```text
PYTHON_ENVIRONMENT_FORENSIC.md
```

Document:

```text
Repository root
Python source root
Preprocessing module path
Current import statements
Dependency manifests
Python version
Expected virtual environment
Current interpreter
Execution commands
Working directory assumptions
```

---

# 4. STEP 2 — CHECK THE PYTHON INTERPRETER

Run and capture:

```bash
python --version
python -c "import sys; print(sys.executable)"
python -c "import sys; print('\n'.join(sys.path))"
python -m pip --version
```

On Windows also check the launcher when available:

```bash
py --version
py -0p
```

Record the exact interpreter path.

The interpreter used by:

```text
terminal
VS Code / Pylance
validation scripts
```

must be identified.

Do not assume they are the same.

---

# 5. STEP 3 — CREATE OR REPAIR THE VIRTUAL ENVIRONMENT

If the repository already contains a project-specific virtual environment, use it unless broken.

Otherwise create an isolated environment inside the project, preferably:

```text
.venv/
```

Example on Windows:

```powershell
py -3.13 -m venv .venv
```

Then use the environment explicitly rather than relying on shell activation:

```powershell
.\.venv\Scripts\python.exe -m pip install --upgrade pip
```

Do not use a global Python environment for the validation workflow unless the repository explicitly requires it.

---

# 6. STEP 4 — INSTALL THE PROJECT'S REAL PYTHON DEPENDENCIES

First determine the authoritative dependency source.

Preferred order:

```text
1. pyproject.toml
2. requirements*.txt
3. environment.yml
4. setup.py / setup.cfg
5. dependencies explicitly imported by the actual code
```

Install the project's declared dependencies into the selected `.venv`.

Examples only — do not blindly install them:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

or:

```powershell
.\.venv\Scripts\python.exe -m pip install -e .
```

If the project has development/test requirements, install those too when the validation scripts need them.

---

# 7. STEP 5 — DETERMINE WHETHER `src.preprocessing` IS A LOCAL MODULE

Explicitly verify whether one of these exists:

```text
src/preprocessing.py
src/preprocessing/__init__.py
```

If neither exists:

```text
STOP
```

Do not create a fake preprocessing module merely to satisfy the import.

Search the repository for the real preprocessing implementation.

Possible locations include:

```text
preprocessing.py
dataset.py
train_baseline.py
training/
ml/
model/
scripts/
```

If the preprocessing logic exists elsewhere, determine whether:

```text
a. the import path is stale
b. the module was renamed
c. the file was deleted
d. the project structure changed
e. the validation scripts were authored against a different revision
```

Document the discrepancy.

---

# 8. STEP 6 — FIX THE IMPORT PATH CORRECTLY

Choose the smallest repository-consistent fix.

Valid approaches may include:

```text
A. Run scripts from the repository root
B. Configure VS Code/Pylance extraPaths
C. Correct the local package structure
D. Add missing __init__.py where appropriate
E. Correct a stale local import
F. Install the project itself in editable mode
G. Use an explicit package/module invocation
```

Do not solve a local-module problem by installing an unrelated pip package named similarly.

For example:

```text
Do NOT install a random package called "preprocessing"
just because "src.preprocessing" cannot be resolved.
```

---

# 9. STEP 7 — CONFIGURE VS CODE / PYRIGHT / PYLANCE

If the code runs but the editor still reports:

```text
Cannot find module 'src.preprocessing'
```

fix the editor environment.

Inspect existing:

```text
.vscode/settings.json
pyrightconfig.json
pyproject.toml
```

Use the correct project root / source path configuration.

The selected interpreter in VS Code must be the same environment used for validation.

After changing interpreter/path configuration:

```text
reload the Python extension / VS Code window
re-run import diagnostics
```

Do not mark the environment fixed until both runtime and editor resolution are verified.

---

# 10. STEP 8 — IMPORT SMOKE TEST

Run a direct import test from the repository root.

For example:

```powershell
.\.venv\Scripts\python.exe -c "import src.preprocessing; print(src.preprocessing.__file__)"
```

If the repository structure uses a different package path, use the correct module path.

Then verify the three affected scripts:

```text
export_tensor.py
verify_inference.py
verify_preprocessing.py
```

must import successfully.

Create:

```text
PYTHON_IMPORT_SMOKE_TEST.md
```

Record:

```text
Interpreter
Python version
Module path
Resolved module file
Import result
Dependency status
Editor/Pylance status
```

---

# 11. STEP 9 — CAPTURE INSTALLED DEPENDENCY STATE

Once the environment is working, capture:

```powershell
.\.venv\Scripts\python.exe -m pip freeze
```

Save:

```text
python_environment_freeze.txt
```

Also record important package versions explicitly:

```text
numpy
opencv-python / cv2
Pillow
torch
torchvision
onnx
onnxruntime
onnxruntime-gpu if present
scipy if used
other project-specific packages
```

Only record packages actually installed.

---

# 12. STEP 10 — VERIFY THE TRAINING PREPROCESSING IMPLEMENTATION

Once imports work, reconstruct the preprocessing pipeline from the actual code.

At minimum identify:

```text
Input image load
Image color space
Mask generation
Threshold
Morphology
Connected components
Largest component logic
Bounding box
Padding
Cropping
Illumination correction
Gaussian blur
Resize
Interpolation
Channel ordering
Scaling
Normalization
Tensor layout
dtype
```

Do not infer these from standard practice.

Use the exact implementation.

Create/update:

```text
PREPROCESSING_OPERATION_MATRIX.md
```

Use this structure:

| Stage | Training Implementation | Exact Parameters | Node Implementation | Exact Parameters | Status |
|---|---|---|---|---|---|
| Image load | | | | | |
| Color conversion | | | | | |
| Mask | | | | | |
| Threshold | | | | | |
| Morphology | | | | | |
| Components | | | | | |
| Crop | | | | | |
| Padding | | | | | |
| Illumination | | | | | |
| Blur | | | | | |
| Resize | | | | | |
| Normalization | | | | | |
| Layout | | | | | |
| dtype | | | | | |

---

# 13. STEP 11 — ESTABLISH A FROZEN PREPROCESSING BASELINE

Before changing Node preprocessing, run both implementations on the exact same image set.

Use:

```text
at least 5 representative images
```

Preferably include:

```text
No DR
Mild
Moderate
Severe
PDR
```

when labeled examples are available.

Do not assume the image grade from the model prediction.

Use known labels only when actually available from ground truth.

Record:

```text
image filename
input dimensions
Python output shape
Node output shape
dtype
min
max
mean
std
```

---

# 14. STEP 12 — STAGED PREPROCESSING COMPARISON

Compare intermediate outputs, not just the final tensor.

Required stages:

```text
S0 Original RGB
S1 Mask / grayscale representation
S2 Binary mask
S3 Connected-component result
S4 Bounding box
S5 Cropped / padded image
S6 Illumination-corrected image
S7 Resized image
S8 Normalized RGB
S9 Final float32 tensor
```

Export comparable artifacts for Python and Node.

Do not compare visual screenshots alone.

Use numeric comparisons wherever possible.

---

# 15. STEP 13 — EXACT ELEMENT-WISE FINAL TENSOR COMPARISON

The final deployment input should be:

```text
[1, 3, 384, 384]
float32
```

Convert the Python tensor into the same layout:

```text
NCHW
```

Then calculate:

```text
max_abs_diff
mean_abs_diff
RMSE
median_abs_diff
P95_abs_diff
P99_abs_diff
percentage <= 1e-6
percentage <= 1e-5
percentage <= 1e-4
percentage <= 1e-3
```

Also calculate the statistics separately for:

```text
R
G
B
```

Create:

```text
PREPROCESSING_ELEMENTWISE_COMPARISON.json
```

and:

```text
PREPROCESSING_ELEMENTWISE_COMPARISON.md
```

Do not round tensors before comparison.

---

# 16. STEP 14 — ISOLATE RESIZE DIFFERENCES

The current evidence indicates a likely difference between:

```text
Python OpenCV cv2.resize(..., INTER_AREA)
```

and:

```text
Node sharp.resize(..., lanczos2/current configuration)
```

Perform a controlled experiment.

Compare:

```text
same source image
same dimensions
Python INTER_AREA
Node current resize
any Node/OpenCV-compatible alternative available in the repository
```

Quantify the difference.

Determine whether resize explains most of the final drift.

Do not replace interpolation based only on visual appearance.

---

# 17. STEP 15 — ISOLATE BLUR DIFFERENCES

Determine exact training behavior:

```text
kernel size
sigma
border handling
precision
channel operation
```

Compare the Python and Node implementation.

If the Node implementation cannot reproduce the training operation faithfully, evaluate a technically appropriate alternative that is already compatible with the project architecture.

Document:

```text
candidate implementation
numeric difference
performance impact
runtime dependency impact
maintenance impact
```

Do not add a new library unless there is a concrete need.

---

# 18. STEP 16 — ISOLATE MASK / CROP DIFFERENCES

Compare exactly:

```text
threshold
morphology
connected-component algorithm
selected component
bounding-box coordinates
padding
crop dimensions
```

For every test image, report:

```text
Python bounding box
Node bounding box
delta x
delta y
delta width
delta height
```

A one-pixel difference must not be silently ignored.

---

# 19. STEP 17 — ISOLATE NORMALIZATION DIFFERENCES

Verify the exact sequence of operations used during training.

Confirm:

```text
normalization constants
normalization order
RGB/BGR order
scaling factor
float precision
```

The currently documented training constants are:

```text
mean = [0.534, 0.282, 0.084]
std  = [0.156, 0.082, 0.067]
```

Verify these against the actual training implementation before using them.

Do not substitute ImageNet normalization or any other constants unless the training code explicitly does so.

---

# 20. STEP 18 — REMEDIATE THE NODE PIPELINE

Preferred objective:

```text
Node deployment preprocessing
=
training preprocessing
```

Prefer exact reproduction when practical.

The remediation hierarchy is:

### Strategy A — Exact Node reproduction

Use equivalent algorithms/parameters so the Node tensor numerically matches the training tensor.

### Strategy B — Shared implementation

Use one implementation/source of truth where practical.

### Strategy C — Python oracle

Use Python only as a validation oracle.

Do NOT silently make Python a production runtime dependency.

### Strategy D — Controlled accepted drift

Only acceptable when all of these are demonstrated:

```text
1. drift is quantitatively measured
2. drift is reproducible
3. ONNX output drift is measured
4. predicted-class stability is measured
5. referable/non-referable stability is measured
6. engineering rationale supports acceptance
7. evidence is preserved
```

Never select Strategy D merely because the numbers "look close."

---

# 21. STEP 19 — RE-RUN PYTHON VS NODE ONNX RUNTIME PARITY

After preprocessing remediation, perform two different parity tests.

## Test A — Same Tensor Runtime Parity

Feed the exact same binary tensor to:

```text
Python ONNX Runtime
Node ONNX Runtime
```

Expected:

```text
numerically identical or within machine-level tolerance
```

This confirms runtime parity only.

## Test B — Independent Preprocessing Parity

Feed the same original images through:

```text
Python training preprocessing → Python ONNX Runtime
Node deployment preprocessing → Node ONNX Runtime
```

Then compare:

```text
logits
probabilities
predicted grade
referable probability
referable flag
```

This is the critical test.

Create:

```text
ONNX_INDEPENDENT_PREPROCESSING_PARITY.json
```

---

# 22. STEP 20 — DEFINE MODEL-OUTPUT DRIFT METRICS

For each image compare:

```text
per-class logit delta
max logit delta
mean logit delta
per-class probability delta
max probability delta
predicted class equality
referable probability delta
referable classification equality
```

Do not evaluate only the final predicted class.

Two pipelines can produce the same class while having materially different probabilities.

---

# 23. STEP 21 — DETERMINISM TEST

For the final Node pipeline:

```text
same image
same model
same environment
same preprocessing
```

run at least:

```text
5 sequential evaluations
```

Verify:

```text
tensor equality / bounded floating-point difference
logit equality
probability equality
predicted grade equality
referable flag equality
```

Record variance.

---

# 24. STEP 22 — REGRESSION TESTS

After remediation, run the complete relevant backend regression suite.

At minimum verify:

```text
ONNX adapter
preprocessing
analysis service
case creation
case retrieval
review submission
referable logic
persistence
API contract
frontend inference display if applicable
```

Do not accept a preprocessing fix that breaks the existing clinical workflow contract.

---

# 25. STEP 23 — REAL ONNX E2E TEST

Run the real model through the application path:

```text
image upload
→ preprocessing
→ ONNX Runtime
→ postprocessing
→ referable logic
→ analysis persistence
→ case retrieval
→ frontend rendering
```

Verify:

```text
no mock inference
no MODEL_NOT_INTEGRATED abstention
real ONNX model hash
real model output
correct class mapping
correct referable logic
correct persistence
```

Do not fabricate a clinical grade.

---

# 26. STEP 24 — PERFORMANCE CHECK

Measure preprocessing and total inference separately.

Record:

```text
preprocessing latency
ONNX session initialization
ONNX inference latency
postprocessing latency
total analysis latency
```

Run enough repetitions to report:

```text
min
median
P95
max
```

Do not present one timing sample as representative performance.

---

# 27. STEP 25 — VALIDATION DATASET STATUS

Determine whether a valid labeled validation dataset is actually present.

Search for:

```text
labels.csv
ground_truth.csv
validation.csv
test.csv
APTOS labels
```

Do not infer labels from filenames or model output.

If no valid labels exist:

```text
MODEL PERFORMANCE VALIDATION = BLOCKED
```

Do not calculate or report:

```text
accuracy
sensitivity
specificity
F1
QWK
AUC
confusion matrix
```

as validated model-performance results.

---

# 28. STEP 26 — REQUIRED FINAL EVIDENCE FILES

Create or update:

```text
PYTHON_ENVIRONMENT_FORENSIC.md
PYTHON_IMPORT_SMOKE_TEST.md
python_environment_freeze.txt
PREPROCESSING_OPERATION_MATRIX.md
PREPROCESSING_ELEMENTWISE_COMPARISON.json
PREPROCESSING_ELEMENTWISE_COMPARISON.md
PREPROCESSING_PARITY_REVALIDATION_REPORT.md
ONNX_INDEPENDENT_PREPROCESSING_PARITY.json
ONNX_INDEPENDENT_PREPROCESSING_PARITY.md
PREPROCESSING_PARITY_EVIDENCE_REGISTER.json
```

Also update any existing:

```text
ONNX_VALIDATION_REPORT.md
ONNX_VALIDATION_EVIDENCE_REGISTER.json
```

only where justified by fresh evidence.

Do not overwrite historical evidence without preserving provenance.

---

# 29. REQUIRED EVIDENCE REGISTER FORMAT

Each finding must contain:

```json
{
  "id": "PP-001",
  "category": "environment|preprocessing|onnx|api|regression|performance",
  "claim": "...",
  "status": "PASS|FAIL|PARTIALLY_VERIFIED|BLOCKED|UNVERIFIED",
  "source": "...",
  "command": "...",
  "result": "...",
  "artifact": "...",
  "limitations": "..."
}
```

Every PASS must be traceable to a concrete command/test/artifact.

---

# 30. STOP CONDITIONS

STOP and report instead of guessing when:

```text
1. training preprocessing source cannot be located
2. src.preprocessing is absent and the correct replacement is uncertain
3. dependency manifests conflict
4. Python environment cannot reproduce the training preprocessing
5. model hash changes
6. class mapping changes unexpectedly
7. preprocessing behavior depends on undocumented state
8. labels are missing
9. tensor comparison is unavailable
10. the proposed fix would alter model behavior without evidence
```

---

# 31. PROHIBITED SHORTCUTS

Do NOT:

```text
❌ suppress the Pylance warning only
❌ add random pip packages
❌ install a package named "preprocessing" to satisfy the import
❌ hard-code PYTHONPATH only in one terminal session
❌ ignore a missing local module
❌ declare parity from matching image dimensions
❌ declare parity from similar mean/std
❌ declare parity from matching predicted class on 1 image
❌ tune preprocessing toward desired predictions
❌ change ONNX weights
❌ change class mapping
❌ call technical integration "clinical validation"
❌ report model performance without ground-truth labels
```

---

# 32. DEFINITION OF DONE — ENVIRONMENT

The Python environment is considered repaired only when:

```text
[ ] Correct interpreter identified
[ ] Project virtual environment created/reused
[ ] Required dependencies installed
[ ] Dependency versions captured
[ ] src.preprocessing resolves correctly OR the real module path is correctly restored
[ ] export_tensor.py imports
[ ] verify_inference.py imports
[ ] verify_preprocessing.py imports
[ ] runtime import smoke test passes
[ ] Pylance/Pyright no longer reports the false missing-import error
```

---

# 33. DEFINITION OF DONE — PREPROCESSING PARITY

Preprocessing remediation is complete only when:

```text
[ ] Training preprocessing reconstructed from source
[ ] Node preprocessing fully documented
[ ] All operation mismatches identified
[ ] Intermediate-stage comparison completed
[ ] Final tensor element-wise comparison completed
[ ] Resize behavior validated
[ ] Blur behavior validated
[ ] Mask/crop behavior validated
[ ] Normalization behavior validated
[ ] dtype/layout validated
[ ] Any remaining drift quantified
[ ] Remaining drift accepted only with evidence
```

---

# 34. DEFINITION OF DONE — ONNX RE-VALIDATION

Re-validation is complete only when:

```text
[ ] Model hash unchanged
[ ] Python and Node same-tensor ONNX parity passes
[ ] Independent-preprocessing ONNX parity measured
[ ] Logit drift measured
[ ] Probability drift measured
[ ] Predicted-class stability measured
[ ] Referable probability stability measured
[ ] Referable classification stability measured
[ ] Determinism passes
[ ] API persistence passes
[ ] Frontend rendering passes
[ ] Regression suite passes
[ ] Runtime timing captured
[ ] All evidence artifacts generated
```

---

# 35. FINAL STATUS VOCABULARY

Use exactly one of these final statuses:

## `ENVIRONMENT REPAIRED — PARITY WORK NOT YET COMPLETE`

Use when Python is working but parity remediation is still ongoing.

## `PREPROCESSING PARITY VERIFIED`

Use only when training and deployment preprocessing have been quantitatively demonstrated equivalent within a justified tolerance.

## `PREPROCESSING PARITY ACCEPTED WITH MEASURED DRIFT`

Use only when drift remains, has been quantified, and downstream model-output stability has been demonstrated with documented engineering rationale.

## `PREPROCESSING PARITY BLOCKED`

Use when the training implementation or required environment cannot be reliably reproduced.

## `TECHNICALLY RE-VALIDATED — CLINICAL PERFORMANCE BLOCKED`

Use when preprocessing and ONNX technical validation are complete but no valid labeled dataset exists for model-performance validation.

Do NOT use:

```text
clinically validated
clinically accurate
production clinically validated
regulator-approved
diagnostically proven
```

unless separate evidence explicitly establishes those claims.

---

# 36. FINAL REPORT FORMAT

At the end, produce:

```text
PREPROCESSING_PARITY_REVALIDATION_REPORT.md
```

with this exact high-level structure:

```markdown
# RetinaGuard — Preprocessing Parity Re-validation Report

## 1. Executive Summary

## 2. Environment Repair
- Python version
- Interpreter
- Virtual environment
- Dependency installation
- Import resolution

## 3. Training Preprocessing Contract

## 4. Node Deployment Preprocessing Contract

## 5. Mismatch Analysis

## 6. Remediation Performed

## 7. Element-wise Tensor Comparison

## 8. Python vs Node ONNX Runtime Parity

## 9. Independent Preprocessing → ONNX Parity

## 10. Determinism

## 11. Regression Results

## 12. Performance

## 13. Dataset / Ground Truth Availability

## 14. Limitations

## 15. Evidence Register

## 16. Final Status
```

---

# 37. FINAL EXECUTION ORDER

Follow this order exactly:

```text
PHASE A — ENVIRONMENT
1. inspect repository
2. identify Python interpreter
3. inspect dependency manifests
4. create/reuse .venv
5. install declared dependencies
6. resolve src.preprocessing correctly
7. configure Pylance/Pyright
8. run import smoke tests
9. freeze dependency versions

PHASE B — PREPROCESSING FORENSICS
10. locate authoritative training preprocessing
11. reconstruct full operation matrix
12. inspect current Node preprocessing
13. identify every mismatch

PHASE C — NUMERIC PARITY
14. staged comparisons
15. element-wise final tensor comparison
16. resize isolation
17. blur isolation
18. mask/crop isolation
19. normalization verification

PHASE D — REMEDIATION
20. implement smallest justified fix
21. preserve model and API contracts
22. rerun preprocessing comparison

PHASE E — ONNX RE-VALIDATION
23. same-tensor Python/Node parity
24. independent preprocessing parity
25. logit comparison
26. probability comparison
27. class/referable stability
28. determinism
29. full regression
30. real E2E

PHASE F — PERFORMANCE / EVIDENCE
31. latency measurement
32. dataset availability check
33. evidence register
34. final report
35. final status
```

---

# 38. ANTI-GRAVITY RESPONSE FORMAT

At completion, report only evidence-backed results using:

```text
ENVIRONMENT:
PASS / PARTIAL / BLOCKED

IMPORT RESOLUTION:
PASS / PARTIAL / BLOCKED

TRAINING PREPROCESSING RECONSTRUCTION:
PASS / PARTIAL / BLOCKED

NODE PREPROCESSING RECONSTRUCTION:
PASS / PARTIAL / BLOCKED

ELEMENT-WISE PREPROCESSING PARITY:
PASS / PARTIAL / FAIL / BLOCKED

PYTHON vs NODE SAME-TENSOR ONNX PARITY:
PASS / FAIL

INDEPENDENT PREPROCESSING ONNX PARITY:
PASS / PARTIAL / FAIL / BLOCKED

DETERMINISM:
PASS / FAIL

REGRESSION:
PASS / FAIL

REAL E2E:
PASS / FAIL

MODEL PERFORMANCE VALIDATION:
PASS / BLOCKED

FINAL STATUS:
<one exact status from Section 35>

EVIDENCE FILES:
<paths>

REMAINING RISKS:
<only evidence-backed items>
```

Do not use vague statements such as:

```text
"looks good"
"minor issue"
"probably equivalent"
"production ready"
```

Use measurable evidence instead.

---

# 39. MOST IMPORTANT OUTCOME

The final objective is not merely to remove the red underline in VS Code.

The objective is:

```text
REPRODUCIBLE PYTHON ENVIRONMENT
        ↓
AUTHORITATIVE TRAINING PREPROCESSING
        ↓
NUMERICALLY VERIFIED DEPLOYMENT PREPROCESSING
        ↓
VERIFIED ONNX RUNTIME BEHAVIOR
        ↓
VERIFIED APPLICATION INTEGRATION
        ↓
CLEAR SEPARATION BETWEEN
TECHNICAL VALIDATION
AND
CLINICAL PERFORMANCE VALIDATION
```

Proceed autonomously through all non-blocked steps, preserve evidence, and stop only when an actual ambiguity or missing source prevents a trustworthy conclusion.
