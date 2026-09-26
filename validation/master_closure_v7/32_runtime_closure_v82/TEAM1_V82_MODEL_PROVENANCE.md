# TEAM 1 V8.2 MODEL PROVENANCE

## Artifact Details
- **Supplied Artifact**: `d:\RetinaG\Retina-Guard\retinaguard_resnet18.onnx` (Externally supplied to workspace root)
- **Expected Artifact**: `retinaguard_resnet18.onnx`
- **Expected SHA-256**: `c49e78c9b6c7bfa5b0098bd40a3901d02c7b41c9598cac993891b29263476f3f`
- **Actual SHA-256**: `c49e78c9b6c7bfa5b0098bd40a3901d02c7b41c9598cac993891b29263476f3f` (MATCH)

## File Placement
The backend runtime expects the model to be present at `model/retinaguard_resnet18.onnx` relative to the workspace root.
- **Source**: `d:\RetinaG\Retina-Guard\retinaguard_resnet18.onnx`
- **Destination**: `d:\RetinaG\Retina-Guard\model\retinaguard_resnet18.onnx`
- **Copy Operation**: Executed successfully without altering filename (normalized to expected string). Both hashes match exactly.

## Model Structure & Inference Validation
The model was tested using the `onnxruntime-node` backend logic (`src/inference/adapters/onnxAdapter.js`).
- **Input Names**: `['input']`
- **Output Names**: `['logits']`
- **Adapter Expected Input Tensor**: Float32 Tensor, Shape `[1, 3, 384, 384]` (via `preprocessImage` in inference pipeline).
- **Adapter Expected Output**: 5-class logits tensor.
- **Model Load**: SUCCESS (`isIntegrated: true`, `healthState: READY`).

## Model Output Semantics
The `onnxAdapter.js` code expects a 5-class `logits` array.
- **Transformation**: A Softmax activation is applied manually in `gradeDR()` to produce `probabilities`.
- **Classification**: `predictedClass` is chosen via `argmax(probabilities)`.
- **Severity Flag**: `referable` is calculated as `probabilities[2] + probabilities[3] + probabilities[4] >= 0.50`.
These mapped semantics align correctly with the application logic for Diabetic Retinopathy grading.

## Clinical Safety Note
The successful execution of inference and validation of output semantics **DOES NOT** confer clinical validity or safety. `CLINICAL_VALIDITY_VERIFIED` is NOT claimed. This run strictly validates `MODEL_EXECUTION_VERIFIED`.

## Final Dependency Resolution
- **B-A**: PARTIALLY RESOLVED. The real ONNX model artifact is successfully provided and integrated, resolving the "missing artifact" root cause. However, the full real ML runtime cannot be proven end-to-end due to SQLite dependency failure preventing API startup.
