# Phase 7 — Determinism Report

## Objective
Verify that the ONNX Runtime execution within the deployed Node environment yields strictly identical output values given strictly identical inputs across repeated executions.

## Methodology
`0005cfc8afb6.png` was sequentially pushed through the full E2E execution path (including `sharp` preprocessing and `onnxruntime-node` inference) 5 times in a single un-cached loop execution process.

## Results
- **Run 1:** Class=0, Conf=0.592758, RefProb=0.325797, Logits=[1.4213,-0.5636,0.5266,-1.2557,-1.2079]
- **Run 2:** Class=0, Conf=0.592758, RefProb=0.325797, Logits=[1.4213,-0.5636,0.5266,-1.2557,-1.2079]
- **Run 3:** Class=0, Conf=0.592758, RefProb=0.325797, Logits=[1.4213,-0.5636,0.5266,-1.2557,-1.2079]
- **Run 4:** Class=0, Conf=0.592758, RefProb=0.325797, Logits=[1.4213,-0.5636,0.5266,-1.2557,-1.2079]
- **Run 5:** Class=0, Conf=0.592758, RefProb=0.325797, Logits=[1.4213,-0.5636,0.5266,-1.2557,-1.2079]

## Analysis
There is zero variance in the raw Logits or probabilities across five sequential executions. The `onnxruntime-node` engine behaves with complete internal determinism for isolated synchronous executions.

*Status: VERIFIED*
