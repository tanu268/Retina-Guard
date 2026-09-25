# Phase 5 — Postprocessing Validation

## Implementation Source
`src/inference/adapters/onnxAdapter.js`
`src/matlab/contracts.js`

## Contract Verification
1. **Softmax Transform:** The node execution path calculates Softmax using robust exponential scaling (`maxLogit` subtracted). The probabilities rigorously sum to 1.0 (validated in E2E schema tests).
2. **Argmax Rule:** `predictedClass` correctly iterates `probabilities` to find the exact `Math.max()` index.
3. **Class Dictionary Match:** 
   - `0 → No Apparent DR`
   - `1 → Mild NPDR`
   - `2 → Moderate NPDR`
   - `3 → Severe NPDR`
   - `4 → PDR`
   
The `drGradeCode` accurately references `gradeByCode(predictedClass).label` mapped from `contracts.js` ensuring 100% adherence to the frozen clinical string vocabulary.

*Status: VERIFIED*
