# TEAM 1 V8.4 END-TO-END TRACE

## Execution Path
1. HTTP Client submitted `Left Retina.jpg` to the API via `/images/upload`.
2. HTTP Client triggered analysis via `/analysis/run`.
3. Backend controller invoked `analysisService`.
4. `analysisService` fetched `MATLAB_ADAPTER` (= `onnx`).
5. `onnxAdapter` mapped `retinaguard_resnet18.onnx` into `onnxruntime-node`.
6. Tensor of `Float32Array[1, 3, 384, 384]` generated.
7. ONNX inference produced 5-class logits.
8. Softmax mapping identified `referableProbability`.
9. `sqliteDatabase` persisted the result in the local DB.
10. `queueRepository` transitioned case state to `awaiting_review`.
11. HTTP API returned the successful state.

## Verifiable Traces
- **Artifact**: `retinaguard_resnet18.onnx` (`c49e78c9b6c7bfa5b0098bd40a3901d02c7b41c9598cac993891b29263476f3f`)
- **Runtime**: Node `v22.14.0` / Windows
- **Integration Tests**: See `TEAM1_V84_REGRESSION_REPORT.md` (91/91 tests pass).
- **HTTP Real Integration**: See `TEAM1_V84_API_EVIDENCE.json`.

**Conclusion**: The end-to-end integration loop from client HTTP request -> real ONNX -> actual database state is completely functional.
