# ENGINEER1 — PRE-RECOVERY ML SAFETY HARDENING REPORT
**Project:** RetinaGuard
**Date:** 2026-09-25
**Phase:** Pre-Recovery Safety Hardening — No Model Required

---

## 1. Fail-Closed Behaviour

### Mechanism

The `OnnxAdapter` now implements a two-stage fail-closed architecture:

**Stage 1 — Synchronous pre-flight (constructor):**  
At construction time, `OnnxAdapter` immediately checks whether the model artifact exists on disk using `fs.existsSync()`. If the file is absent, it sets `this.modelIntegrated = false` and `this.healthState = 'FAILED'` synchronously. `MatlabService.runPipeline()` checks `adapter.modelIntegrated === false` before entering any diagnostic stage (preprocessing, anatomy, grading, lesion detection, Grad-CAM). The result is a clean `MODEL_NOT_INTEGRATED` abstention — no image processing, no fake output, no clinical data of any kind.

**Stage 2 — Async eager initialization (pipeline entry):**  
`MatlabService.runPipeline()` now calls `adapter.initialize()` after the `modelIntegrated` pre-flight check but **before preprocessing**. This executes the SHA-256 hash verification and `ort.InferenceSession.create()`. Any failure (hash mismatch, corrupt ONNX, I/O error) sets `this.modelIntegrated = false` and the pipeline returns `MODEL_NOT_INTEGRATED` — never `STAGE_FAILURE`, never preprocessing.

**The safety invariant:**

```
IF model file absent         → modelIntegrated = false (constructor)  → abstain
IF model hash mismatch       → modelIntegrated = false (_initialize)  → abstain
IF ort.create() fails        → modelIntegrated = false (_initialize)  → abstain
IF any subsequent stage fail → STAGE_FAILURE                          → abstain
NEVER                        → fake grade / fake probabilities / fake lesions
```

### Files Modified

| File | Change |
|---|---|
| `src/inference/adapters/onnxAdapter.js` | Constructor pre-flight check; `modelIntegrated=false` on all init failures |
| `src/matlab/matlabService.js` | Eager `initialize()` call with `MODEL_NOT_INTEGRATED` routing |
| `src/config/index.js` | `modelHash` default set to the authoritative SHA-256 |

---

## 2. Model Hash Guard

The authoritative SHA-256 for `retinaguard_resnet18.onnx` is now the hardcoded default in [`src/config/index.js`](file:///home/yash/Desktop/Projects/Retina-Guard/retinaguard-backend/src/config/index.js):

```javascript
modelHash: process.env.MODEL_HASH
  || 'c49e78c9b6c7bfa5b0098bd40a3901d02c7b41c9598cac993891b29263476f3f',
```

When a real model is installed:
1. `OnnxAdapter._initialize()` reads the file and computes SHA-256 via Node.js `crypto.createHash('sha256')`.
2. The computed hash is compared (lowercase, case-insensitive) with `config.matlab.modelHash`.
3. If they differ → `modelIntegrated = false` + error log + `MODEL_NOT_INTEGRATED` abstention.
4. The specific error message: `Model hash mismatch. Expected <expected>, got <actual>` — logged at `error` level.
5. Inference proceeds only if hash matches AND `ort.InferenceSession.create()` succeeds.

To override the expected hash (e.g. after a legitimate model update): `MODEL_HASH=<new_hash>` in the deployment `.env` file.

---

## 3. Mock Isolation

The `MockMatlabAdapter` retains `modelIntegrated = false`. Its clinical methods (`gradeDR`, `detectLesions`, `generateGradCAM`) all `throw` rather than return synthetic data — they are backstops that can never be reached in normal operation because `matlabService` abstains before calling them.

**What the mock adapter does (permitted):**
- `qualityAssessment()` — deterministic, seeded from image hash (controls capture recapture workflow)
- `preprocessImage()` — returns the input path unchanged (no-op)
- `health()` — returns `{ available: true, note: 'Deterministic stub — not a clinical result.' }`
- `detectAnatomy()` — still returns mock anatomy for UI rendering purposes (anatomical detection is non-clinical context in the current system)

**What the mock adapter cannot do (blocked by design):**
- Return any DR grade
- Return any probability distribution
- Return any lesion detection result
- Return any Grad-CAM output

The 2 currently-skipped tests in `matlabService.test.js` (`it.skip`) test the old PRNG-based mock grading behaviour that was intentionally removed. They remain skipped and are not re-enabled.

---

## 4. Abstention Behaviour

When the model is unavailable, `runPipeline()` returns a fully-formed abstention object:

```json
{
  "status": "abstained",
  "abstainReason": "MODEL_NOT_INTEGRATED",
  "abstainMessage": "<human-readable message from ABSTAIN_REASONS>",
  "quality": { "qualityGrade": "A", "gradeable": true, ... },
  "grading": null,
  "anatomy": null,
  "lesionEvidence": null,
  "gradcam": null,
  "gradeLabel": null,
  "stageTimingsMs": { "total": <ms> },
  "warnings": [],
  "error": null,
  "adapter": "onnx"
}
```

**Critically:**
- `grading: null` — no DR grade is ever set
- `gradeLabel: null` — no label is ever set
- `lesionEvidence: null` — no lesion data is ever set
- `gradcam: null` — no Grad-CAM is ever set

The abstained case is routed to human reviewer queue by the analysis service. This is the correct clinical safety behaviour.

---

## 5. API Compatibility

No API contracts were modified. The abstention response schema is unchanged. The following are confirmed unchanged:

| Contract | Status |
|---|---|
| Case UUID format | UNCHANGED |
| Analysis response schema | UNCHANGED |
| `abstainReason` field values | UNCHANGED — `MODEL_NOT_INTEGRATED` was already a valid reason |
| Review API endpoints | UNCHANGED |
| Sync state machine | UNCHANGED |
| Frontend DTO contract | UNCHANGED |
| `modelVersion` field | UNCHANGED |

The `ABSTAIN_REASONS` constant in `src/matlab/contracts.js` already contains `MODEL_NOT_INTEGRATED` — no new reason codes were added.

---

## 6. Tests

New test suite: [`tests/unit/onnxSafety.test.js`](file:///home/yash/Desktop/Projects/Retina-Guard/retinaguard-backend/tests/unit/onnxSafety.test.js)

| Test ID | Description | Assertion |
|---|---|---|
| 1 & 5 | Model artifact missing → `MODEL_NOT_INTEGRATED` abstention | `status='abstained'`, `abstainReason='MODEL_NOT_INTEGRATED'`, `gradeLabel=null`, `grading=null`, `lesionEvidence=null` |
| 2 | Model file exists but is corrupt (not valid ONNX) → abstention | `status='abstained'`, `abstainReason='MODEL_NOT_INTEGRATED'` |
| 3 | Model file exists but hash does not match → abstention | `status='abstained'`, `abstainReason='MODEL_NOT_INTEGRATED'`, `error` matches `/hash mismatch/i` |
| 4 | Model unavailable → zero fabricated clinical data | `grading=null`, `gradeLabel=null`, `anatomy=null`, `lesionEvidence=null`, `gradcam=null` |
| 6 | Valid model (mocked `ort`) → pipeline completes | `status='completed'`, `gradeLabel` defined, `grading.drGradeCode=0` |
| 7 | Mock adapter → `MODEL_NOT_INTEGRATED` abstention, clinical stages never run | `status='abstained'`, `abstainReason='MODEL_NOT_INTEGRATED'`, `grading=null`, `lesionEvidence=null` |

---

## 7. Exact Test Counts

```
npm test
```

**Exit code: 0**

```
Test Suites: 20 passed, 20 total
Tests:        2 skipped, 91 passed, 93 total
Snapshots:    0 total
Time:         5.174 s
```

| Suite | File | Result |
|---|---|---|
| Pre-Recovery ML Safety Hardening | `tests/unit/onnxSafety.test.js` | ✓ 7 passed |
| MatlabService (mock adapter) | `tests/unit/matlabService.test.js` | ✓ 3 passed, 2 skipped |
| MATLAB contracts | `tests/unit/matlabContracts.test.js` | ✓ PASS |
| Analysis Service | `tests/unit/analysisService.test.js` | ✓ PASS |
| Clinical Safety Service | `tests/unit/clinicalSafetyService.test.js` | ✓ PASS |
| All other suites | 15 additional suites | ✓ PASS |

**No regressions. All prior passing tests remain passing.**

---

## 8. Build Result

The project uses `node src/server.js` as its runtime — no build compilation step. Syntax validity confirmed by test execution:

```
npm test  →  exit 0 (all 20 suites pass in 5.174 s)
```

Node.js compatibility note: The project requires `node >= 22.0.0`. System node is `v20.20.2`; however, `npm install` completed successfully and all tests pass because the engine constraint is not enforced at runtime.

---

## 9. Preprocessing Performance Baseline

**Test environment:**
- Machine: Linux x86-64
- Node.js: v20.20.2
- Image: Synthetic 512×512 RGB JPEG (fundus-like circular region on black background)
- OpenCV.js: `@techstark/opencv-js@5.0.0-release.1` (WASM)
- Image pipeline: `sharp` → raw RGB → OpenCV.js WASM → Float32Array output

**Operations:**  
circular mask → morphological close/open → crop (5px pad) → illumination correction (GaussianBlur 101×101) → clip → resize 384×384 INTER_AREA → CHW normalization (FROZEN_MEAN/STD)

| Run | Duration (ms) |
|---|---|
| Warmup (WASM init included) | 237 |
| 1 | 126 |
| 2 | 126 |
| 3 | 121 |
| 4 | 122 |
| 5 | 122 |
| 6 | 120 |
| 7 | 119 |
| 8 | 120 |
| 9 | 117 |
| 10 | 119 |

| Metric | Value |
|---|---|
| N | 10 |
| Mean | **121.2 ms** |
| Median | 121 ms |
| Min | 117 ms |
| Max | 126 ms |
| Std | 2.8 ms |
| Throughput | **8.25 images/sec** |

**Notes:**
- The warmup (237ms) includes WASM module initialization, which is a one-time cost per process.
- After warmup, the pipeline is highly consistent (σ=2.8ms).
- This Linux machine (120ms/image) is significantly faster than the Windows developer machine (~2700ms/image reported in `RETINAGUARD_FINAL_VALIDATION_AUDIT.md`). The Windows bottleneck was attributed to WASM GaussianBlur taking ~21s/image — likely a different WASM runtime or V8 optimization profile.
- **No code was changed for the benchmark.** This is a true baseline of the unmodified preprocessing path.
- The dominant operation is `GaussianBlur(101×101)` on a `float32` channel (3× per image). This scales with image resolution and WASM SIMD support.
- For production clinical screening, 8 images/sec single-threaded (after warmup) is adequate for a point-of-care device with one patient at a time.

---

## 10. Remaining Blockers

1. **MODEL ARTIFACT:** `retinaguard_resnet18.onnx` not present on this Linux machine. The model author (`tanu268`) must deliver the file. Hash guard will verify: `c49e78c9b6c7bfa5b0098bd40a3901d02c7b41c9598cac993891b29263476f3f`.
2. **VALIDATION IMAGES:** 701 APTOS 2019 evaluation images on Google Colab / Windows machine. Not locally available.
3. **REAL INFERENCE NOT TESTABLE:** The ONNX test in the safety suite mocks `ort.InferenceSession.create()` and `gradeDR`. Full end-to-end inference cannot be verified without the model artifact.

---

## FINAL STATUS

```
SAFETY HARDENING:
  PASS
  (fail-closed on missing artifact, hash mismatch, and init failure;
   all 7 safety tests pass; 20/20 suites pass; no regressions)

MODEL RECOVERY:
  BLOCKED — EXTERNAL ARTIFACT REQUIRED

REAL INFERENCE:
  BLOCKED

CLINICAL VALIDATION:
  NOT ESTABLISHED

CHANGES MADE:
  src/inference/adapters/onnxAdapter.js  — fail-closed constructor + hash guard
  src/matlab/matlabService.js            — eager initialization before preprocessing
  src/config/index.js                    — authoritative model hash as default
  tests/unit/onnxSafety.test.js          — 7 new safety tests (all pass)
```
