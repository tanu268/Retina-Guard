# Phase 6 — Referable DR Logic

## Implementation Source
`src/inference/adapters/onnxAdapter.js`
`src/matlab/contracts.js`

## Logic Verification
The referable logic operates on the binary boundary:
- **Non-Referable:** Grades 0, 1 (`No Apparent DR`, `Mild NPDR`)
- **Referable:** Grades 2, 3, 4 (`Moderate NPDR`, `Severe NPDR`, `PDR`)

The node ONNX adapter correctly calculates `referableProbability` precisely as:
`probabilities[2] + probabilities[3] + probabilities[4]`

The binary `referable` threshold activates strictly at `>= 0.50` (or equivalently by summing the probabilities). This exactly reproduces the defined standard without substituting confidence metrics.

*Status: VERIFIED*
