# RetinaGuard System Integration Control Plane

This document outlines the strategy for executing the **RetinaGuard Integration Phase**, as defined in the `RetinaGuard_Integration_Phase_Master_Prompt_BMPv2.md`.

## 1. Goal
Integrate the completed RetinaGuard components into **one deterministic, reproducible, evidence-backed Release Candidate**. We will prove that the independently completed RetinaGuard components operate together as one coherent system without violating the frozen Engineer-2 contracts, clinical-safety invariants, security boundaries, offline-first behavior, or reproducibility requirements.

## 2. Phase Control Model Strategy
The integration will be executed in four controlled modes.

### MODE 1 — DISCOVERY
**Goal:** Map the system without modifying production code.
**Deliverables:**
- `ENGINEER2_FROZEN_BASELINE.md`: Record the verified state of the frozen Engineer 2 baseline.
- `integration_inventory.md`: Complete component inventory and integration risk assessment.
- `integration_contract_matrix.md`: Trace critical fields (e.g. `case_uuid`, `severity`) across boundaries to find contract mismatches.
- `case_state_machine.md`: Reconstruct and map the actual case lifecycle, including failure and offline states.

### MODE 2 — INTEGRATION
**Goal:** Connect existing components and resolve proven contract mismatches.
- We will fix any DTO compatibility issues, configuration issues, or integration test defects based on the contract matrix.
- We will execute a full E2E system flow manually to identify any blocking integration issues.
- **Change Budget:** 0 rewrites, 0 new features, minimal necessary fixes for system correctness.

### MODE 3 — VALIDATION
**Goal:** Freeze implementation and execute acceptance evidence.
- Full E2E Demo recording (Technician → AI Analysis → Reviewer → Sync).
- Execute Golden Fixture (`e2ePipeline.test.js`) and record results.
- Execute clean-room reproduction.
- Populate `INTEGRATION_EVIDENCE_REGISTER.json` and `INTEGRATION_TRACEABILITY_MATRIX.md`.

### MODE 4 — RELEASE
**Goal:** Finalize the Release Candidate.
- Produce `INTEGRATION_RELEASE_CANDIDATE_REPORT.md`.
- Issue final Integration Verdict.

## 3. User Review Required
> [!IMPORTANT]
> The current system has been frozen by Engineer 2. Any modifications to the system during MODE 2 must be justified by an integration failure and require an explicit "Approval-by-Evidence" review.

## 4. Verification Plan
- **Automated Tests:** Execute `npm run test` (19 suites) to ensure the frozen baseline remains unbroken.
- **Manual Verification:** Execute and record a deterministic SIH demonstration (Full System Demo) covering online functionality and offline synchronization capabilities.
