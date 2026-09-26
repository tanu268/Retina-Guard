# PCA → PCB Handoff

Branch:
main

Commit:
(see git log — commit created as part of this handoff push)

Model:
model/retinaguard_resnet18.onnx

Model SHA-256:
C49E78C9B6C7BFA5B0098BD40A3901D02C7B41C9598CAC993891B29263476F3F

ONNX Runtime:
onnxruntime-node 1.30.0

Current preprocessing:
sharp + 384×384 resize (fit: fill, kernel: linear) + /255 + ImageNet mean/std normalization + CHW float32

Technical ONNX/Python parity:
PASS (Max logit diff = 0 over 10 runs)

Determinism:
PASS (0 variance over 10 identical invocations)

End-to-end latency (avg):
~116 ms (Decode+Preprocess: ~53 ms | ONNX Inference: ~63 ms)

Fresh 701-image validation:
BLOCKED

Training preprocessing parity:
BLOCKED

Known blockers:
1. 701 validation image files unavailable (D:\RetinaGuard_Data\aptos2019\train_images\ does not exist on PCA)
2. Training preprocessing source (model/RetinaGuard_ML/src/preprocessing.py) is missing from repository

---

## What PCB receives in this push

### Frontend source
- RetinaGuard-Frontend-v3/src/pages/landing/Login.tsx
  (local /img/ role images replacing Unsplash external URLs)
- RetinaGuard-Frontend-v3/public/img/administrator.jpg
- RetinaGuard-Frontend-v3/public/img/ophthalmologist.jpg
- RetinaGuard-Frontend-v3/public/img/technician.jpg

### Backend scripts (path-corrected for PCA machine)
- retinaguard-backend/extract_g19.js
- retinaguard-backend/run_real_api_tests.js

### Evidence (V7.2 closure + V8.1 / V8.2 / V8.3 / V8.6)
- validation/master_closure_v7/32_runtime_closure_v72/ (updated evidence + new closures)
- validation/master_closure_v7/32_runtime_closure_v81/
- validation/master_closure_v7/32_runtime_closure_v82/
- validation/master_closure_v7/32_runtime_closure_v83/
- validation/master_closure_v7/34_runtime_closure_v86/TEAM1_V86_AI_TRUTH_MATRIX.json
- validation/master_closure_v7/34_runtime_closure_v86/TEAM1_V86_AUTHORITATIVE_AI_VALIDATION_REPORT.md
- validation/master_closure_v7/34_runtime_closure_v86/PCA_TO_PCB_HANDOFF.md (this file)

---

## What PCA does NOT transfer

| Item | Reason |
|---|---|
| model/retinaguard_resnet18.onnx | PCB owns canonical model |
| node-v22/ + zip | Local Node distribution, not tracked |
| retinaguard-backend/node_logits.json | Temporary inference artifact |
| retinaguard-backend/python_inference.json | Temporary inference artifact |
| retinaguard-backend/tensor_out.bin | Temporary tensor artifact |
| retinaguard-backend/test_inference.js | Temporary script |
| retinaguard-backend/test_onnx.js | Temporary script |
| retinaguard-backend/run_v83_api_tests.js | Temporary script |
| retinaguard-backend/run_v84_api_tests.js | Temporary script |
| retinaguard-backend/run_v85_api_tests.js | Temporary script |
| retinaguard_resnet18.onnx (root duplicate) | Temporary duplicate, not canonical |

---

**IMPORTANT:** This file is a handoff record only.
No clinical-performance claims are made.
No medical validity is asserted.
AI validation performance remains BLOCKED pending dataset recovery.
