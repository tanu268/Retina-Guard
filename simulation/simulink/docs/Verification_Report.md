# RetinaGuard SimEvents Model Verification Report

## 1. Executive Summary
The RetinaGuard capacity and queueing models (Day 1 & Day 2) have been successfully built and executed programmatically using MATLAB/SimEvents. The models simulate the routing and processing of patients through Image Capture, AI inference, and Specialist Review.

## 2. Model Structure Verification
- **Day 1 Model (`RetinaGuard_SimEvents_Day1_Verified.slx`)**:
  - Implements the baseline linear pipeline: Generator -> Queue -> Server -> Terminator.
  - Verified programmatic instantiation of SimEvents blocks (`sldelib` library blocks).
- **Day 2 Model (`RetinaGuard_SimEvents_Day2.slx`)**:
  - Implements dynamic entity routing.
  - **Entity Generator**: Generates patients (entities) with inter-generation time of 0.5 mins.
  - **Capture Server**: Absorbs "Poor Quality" rework structurally by inflating the service time $T_{eff} = T_{nom} / (1 - P_{poor})$.
  - **AI Server**: Modifies entity attributes (`AIResult`) dynamically via the `EntryAction` event.
  - **Entity Output Switch**: Reads the `AIResult` attribute to dynamically route patients. `1` -> Normal Exit, `2` -> Reviewer Queue.

## 3. Structural Defect Resolutions
During the verification and build loops, the following architecture issues were caught and permanently fixed:

1. **Entity Attribute Creation Error**: SimEvents `GenerateAction` cannot define new attributes in strictly-typed code generation. 
   *Resolution*: Defined attributes natively via the `AttributeName` and `AttributeInitialValue` mask parameters on the Entity Generator block.
2. **Switch Parameter Mismatch**: Initially attempted to use `AttributeName` on the Output Switch.
   *Resolution*: Replaced with `SwitchAttributeName`, which is the correctly typed underlying parameter for the `sldelib/Entity Output Switch` block.
3. **Action Script Codegen Restriction**: The `evalin('base',...)` command is forbidden in SimEvents block actions during code generation.
   *Resolution*: Removed `evalin`. Embedded probability parameters as hard-coded literals in the MATLAB action string strings immediately prior to `sim()`.
4. **ExitAction Mutation Restriction**: SimEvents blocks modifying entities (e.g., `entity.AIResult = 1`) failed in the `ExitAction` hook.
   *Resolution*: Moved attribute mutation to the `EntryAction` hook.

## 4. Operational Sign-off
The models successfully instantiate, execute, and yield end-to-end throughput statistics. The programmatic generation pipeline is completely autonomous and reproducible via `master_build_and_run.m`.
