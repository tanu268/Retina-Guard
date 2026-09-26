# TEAM 1 V8.3 MODEL EXECUTION TRACE

## Evidence of Real Inference
During the V8.3 closure run, the RetinaGuard API was started with the `onnx` adapter.
A test image (`Left Retina.jpg`) was POSTed to the API (`/images/upload`) and triggered for analysis (`/analysis/run`).

**Trace Data**:
```json
{
  "artifact": "retinaguard_resnet18.onnx",
  "hash": "c49e78c9b6c7bfa5b0098bd40a3901d02c7b41c9598cac993891b29263476f3f",
  "runtime": "Node.js v22.14.0",
  "adapter": "onnxruntime-node",
  "input_shape": "[1, 3, 384, 384]",
  "input_type": "float32",
  "output_shape": "[1, 5]",
  "success": true
}
```

The system successfully persisted the result, mapped the output to `referableProbability`, and updated the case status to `awaiting_review`.

**Conclusion**: The model execution pathway through the real application backend is verified.
