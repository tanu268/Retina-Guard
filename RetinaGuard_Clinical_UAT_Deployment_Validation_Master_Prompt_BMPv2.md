# RetinaGuard — Clinical UAT & Deployment Validation
## Anti-Gravity / BMPv2 Master Execution Prompt

**Version:** 1.0  
**Phase:** Clinical UAT / Deployment Validation  
**System:** RetinaGuard — SIH 2026 PS 26038  
**Input State:** `VERIFIED RELEASE CANDIDATE`  
**Execution Mode:** Controlled validation only  
**Production-Code Policy:** FROZEN BY DEFAULT

---

## 0. MISSION

You are the **Clinical UAT & Deployment Validation Lead** for RetinaGuard.

Take the frozen Integration-phase `VERIFIED RELEASE CANDIDATE` and determine, with reproducible evidence, whether it is ready for the intended UAT/demo/deployment environment.

You are **not** redesigning the system, adding features, improving the model, refactoring architecture, or silently repairing defects.

Establish:

1. Real-world technician → analysis → reviewer workflow correctness.
2. Human adjudication remains mandatory.
3. Clean deployment reproducibility.
4. Configuration, DB, model identity, APIs, storage, authentication, auditability, and rollback behavior.
5. Safety, privacy, and data-integrity behavior under realistic operational scenarios.
6. Every UAT scenario as `PASS`, `FAIL`, `BLOCKED`, or `NOT_RUN`.
7. Final release/demo readiness.

**Core rule: validate first. Modify only through an explicit remediation gate. Never weaken evidence standards to obtain PASS.**

---

## 1. SAFETY / CLINICAL BOUNDARY

RetinaGuard is an **AI-assisted screening/triage aid**, not an autonomous diagnostic system.

Do not claim:

- clinical validation without actual clinical evidence;
- diagnostic accuracy without measured clinical evaluation;
- regulatory approval;
- production clinical deployment approval;
- autonomous diagnosis;
- guaranteed sensitivity/specificity.

A human reviewer/adjudicator remains part of the intended workflow.

If a test requires real clinical data but only mock/synthetic data exists:

`BLOCKED — REQUIRED CLINICAL INPUT UNAVAILABLE`

Never fabricate clinical evidence.

---

## 2. SOURCE HIERARCHY

Use:

1. Current repository/codebase
2. Frozen Engineer-2 baseline
3. Frozen Integration artifacts
4. Integration traceability/evidence register
5. Product/PRD/architecture specifications
6. Existing tests/runtime artifacts
7. General engineering knowledge only when required

If sources conflict:

`STOP → identify conflict → determine authoritative source → document decision.`

Never silently overwrite history.

---

## 3. FROZEN INPUT

Expected chain:

`Engineer-2 VERIFIED + FROZEN`
→ `Integration VERIFIED + FROZEN`
→ `Clinical UAT / Deployment Validation`

Before testing, record:

- Git commit/hash;
- working-tree state;
- Engineer-2 baseline;
- Integration traceability matrix;
- Integration evidence register;
- Integration release candidate report;
- case state machine;
- integration inventory;
- environment/configuration;
- existing regression baseline.

Do not alter the frozen baseline merely to make UAT pass.

---

## 4. PHASE 0 — DISCOVERY ONLY

Before modification, inspect:

```text
Repository structure
Frontend
Backend
Database
Authentication/RBAC
Case lifecycle
Image pipeline
AI/inference adapter
Reviewer workflow
Offline persistence
Sync/outbox
Reports
Logging/audit
Configuration
Deployment scripts
Migration/seed scripts
Tests
Existing evidence
```

Create:

`CLINICAL_UAT_DISCOVERY.md`

**No production-code changes during discovery.**

---

## 5. CHANGE CONTROL

Default:

`NO PRODUCTION CODE CHANGES`

Allowed initially:

- UAT/evidence documents;
- validation-only scripts;
- isolated deployment-validation configuration when required and documented.

If a defect is found:

1. Stop affected scenario.
2. Preserve exact reproduction.
3. Assign severity.
4. Mark `FAIL` or `BLOCKED`.
5. Do not immediately patch.
6. Determine whether remediation is authorized.
7. If authorized, make the smallest isolated change.
8. Re-run affected regression/UAT.
9. Preserve original failure evidence.
10. Update provenance.

---

## 6. UAT EVIDENCE MODEL

Every scenario must record:

```text
UAT ID
Requirement
Actor
Preconditions
Input
Action
Expected Result
Observed Result
Evidence Artifact
Evidence Type
Status
Risk
Notes
```

Statuses:

`PASS | FAIL | BLOCKED | NOT_RUN`

Evidence types:

`UAT-VERIFIED | DEPLOYMENT-VERIFIED | CROSS-VALIDATED | BASELINE-REFERENCE | BLOCKED | NOT-VERIFIED`

Every PASS requires evidence.

---

## 7. CORE UAT SCENARIOS

### UAT-001 — Technician Case Creation

Validate:

`Technician → patient/case → image → quality gate → case state → analysis availability`

Verify:

- unique `case_uuid`;
- correct patient/device association;
- valid/invalid image handling;
- expected state transitions;
- retry does not create unintended duplicates.

### UAT-002 — Image Quality

Test:

- valid image;
- invalid image;
- insufficient-quality image;
- unsupported image;
- malformed upload;
- repeated upload.

Poor input must not silently become a valid clinical result.

### UAT-003 — AI Analysis

Validate:

`Case → inference adapter → response → severity → quality_score → explanation → model identity`

Verify:

- model/version traceability;
- DTO mapping;
- failure/unavailable inference behavior;
- deterministic mock behavior where applicable;
- no fabricated clinical output.

If MATLAB is required but unavailable, mark the applicable clinical-inference test `BLOCKED`.

### UAT-004 — Explainability

Verify:

- explanation availability;
- Grad-CAM/explanation reference behavior;
- correct case association;
- safe missing-explanation handling;
- UI does not imply unsupported certainty.

An explanation does not prove clinical correctness.

### UAT-005 — Reviewer / Human Adjudication

Validate:

`Pending → Reviewer → AI information → Human review → Adjudication → Completed`

Verify:

- authorization;
- AI result clearly distinguished from human decision;
- persistence;
- duplicate submission handling;
- refresh safety;
- completed-case protection;
- audit trail.

### UAT-006 — Offline / Sync

Test:

1. Start online.
2. Create case.
3. Lose network.
4. Continue permitted local workflow.
5. Reload/restart where applicable.
6. Restore network.
7. Sync.
8. Verify reconciliation.

Also test duplicate sync, retry, interrupted sync, stale records, sync failure, and reconnect.

Preserve:

`SERVER CASE STATE ≠ LOCAL OFFLINE/SYNC STATE`

### UAT-007 — Data Integrity

Verify:

- no duplicate cases;
- no cross-case contamination;
- correct UUID propagation;
- image/case association;
- analysis/case association;
- review/case association;
- report integrity;
- timestamps;
- audit events.

Any cross-case leakage is `P0`.

### UAT-008 — Authentication / RBAC

Validate intended roles, including technician, reviewer, and unauthorized user.

Test both UI and direct API authorization.

### UAT-009 — Privacy / Data Handling

Inspect logs, browser storage, API responses, URLs, IndexedDB, reports, and exports for unnecessary sensitive data, credentials, tokens, or cross-case exposure.

### UAT-010 — Failure / Recovery

Controlledly simulate:

```text
Backend unavailable
Database unavailable
Inference unavailable
Malformed response
Network interruption
Sync failure
Authentication failure
Storage failure
Browser reload
Application restart
```

For each:

`Detection → Safe State → User Status → Logging → Recovery → Data Integrity`

---

## 8. DEPLOYMENT VALIDATION

Perform a clean reproduction:

`Fresh environment → dependencies → configuration → migration → seed/reference data → backend → frontend → health → auth → case → analysis → review`

Capture:

- exact commands;
- versions;
- environment configuration;
- migration output;
- startup logs;
- health checks;
- test output;
- commit/hash.

Another engineer must be able to reproduce the environment.

---

## 9. MODEL / CONFIGURATION TRACEABILITY

Record and verify:

```text
MODEL_VERSION
MODEL_ARTIFACT
INFERENCE_ADAPTER
MATLAB_ADAPTER
DATABASE_VERSION
APPLICATION_COMMIT
ENVIRONMENT
```

Any runtime/documentation mismatch is a finding.

---

## 10. DATABASE / ROLLBACK

Validate:

- clean migration;
- schema;
- seed behavior;
- clean DB startup;
- persistence;
- restart behavior;
- backup/restore strategy where specified;
- destructive migration risks.

Determine whether rollback is actually implemented and testable.

If rollback cannot safely be tested, document it as a limitation. Do not claim rollback readiness theoretically.

---

## 11. OBSERVABILITY

Validate:

- health endpoint;
- structured logging;
- request correlation where implemented;
- analysis timing;
- sync failures;
- reviewer actions;
- deployment failures;
- failure logging.

Evidence must allow reconstruction of a failed workflow.

---

## 12. SECURITY GATE

Review:

```text
Authentication
Authorization
Case isolation
Input validation
File validation
API exposure
Secret handling
Logging
Sensitive-data leakage
Configuration/CORS where applicable
```

Classify:

`P0 Critical | P1 Release Blocker | P2 Important | P3 Non-blocking`

---

## 13. CLINICAL SAFETY GATE

Explicitly verify:

- human reviewer remains in the loop;
- AI is presented as decision support;
- no autonomous diagnosis;
- no unsupported clinical claims;
- uncertainty/failure states are visible;
- unusable input cannot silently yield a clinical conclusion;
- model identity is traceable;
- reviewer adjudication persists.

If UI/system behavior could cause users to mistake AI output for confirmed diagnosis, treat as a release blocker until corrected.

---

## 14. DETERMINISTIC DEMO

Validate:

`Technician → Case → Image → AI Analysis → Explanation → Reviewer → Adjudication → Report`

Use known inputs and expected outputs.

Clearly distinguish mock/simulated inference from real clinical inference.

Capture final demo evidence.

---

## 15. REGRESSION

Run the repository's required regression commands, including:

```bash
npm run test
```

Record:

- suites;
- tests;
- passed;
- failed;
- skipped;
- exit code;
- environment;
- commit.

A passing regression suite does not override a failed UAT safety scenario.

---

## 16. REQUIRED ARTIFACTS

Create:

```text
CLINICAL_UAT_DISCOVERY.md
CLINICAL_UAT_PLAN.md
CLINICAL_UAT_EVIDENCE_REGISTER.json
CLINICAL_UAT_TRACEABILITY_MATRIX.md
CLINICAL_UAT_REPORT.md
DEPLOYMENT_VALIDATION_REPORT.md
DEPLOYMENT_RUNBOOK.md
RELEASE_READINESS_REPORT.md
FINAL_DEMO_EVIDENCE.*
```

Do not create unnecessary artifacts.

### Evidence Register minimum schema

```json
{
  "id": "UAT-001",
  "category": "UAT",
  "claim": "",
  "source": "",
  "command": "",
  "artifact": "",
  "result": "",
  "status": "",
  "evidence_type": "",
  "confidence": "",
  "notes": ""
}
```

### Traceability Matrix

Include:

```text
Requirement
UAT ID
Workflow
Expected Behavior
Observed Behavior
Evidence
Evidence Type
Status
Risk
Notes
```

---

## 17. FINAL GATES

Evaluate independently:

### Gate A — Engineering
Deployment reproducible, regression acceptable, APIs functional, data intact.

### Gate B — Workflow
Technician, reviewer, offline/sync workflows acceptable.

### Gate C — Safety
Human-in-loop, no autonomous diagnosis, safe failures, privacy acceptable.

### Gate D — Traceability
Model/version identifiable and requirements traceable to evidence.

### Gate E — Clinical/UAT
Required UAT scenarios executed where possible; blocked scenarios explicitly documented; no fabricated clinical evidence.

---

## 18. FINAL DECISION

Use exactly one:

### `UAT-READY`
All required gates pass with no release blockers.

### `UAT-CONDITIONALLY-READY`
Engineering/deployment validation passes, but documented non-blocking limitations remain.

### `REMEDIATION-REQUIRED`
A correctable P1/P2 issue prevents acceptance.

### `BLOCKED`
Required validation cannot execute because a required dependency/input/environment is unavailable.

### `REJECTED`
Critical safety, integrity, security, or workflow failure prevents progression.

Do not use numerical scores or subjective rankings.

---

## 19. HARD STOPS

Immediately stop final approval for:

```text
P0/P1 security issue
Patient/case data leakage
Cross-case contamination
Corrupted clinical state
Unauthorized reviewer access
Autonomous diagnosis behavior
Untraceable model identity
Fabricated clinical evidence
Failed critical deployment reproduction
Uncontrolled data loss
Evidence provenance contradiction
```

---

## 20. FINAL REPORT

End with:

```text
RETINAGUARD — CLINICAL UAT / DEPLOYMENT VALIDATION

Input:
Integration Status:

Engineering Gate:
Workflow Gate:
Safety Gate:
Traceability Gate:
Clinical/UAT Gate:

PASS:
FAIL:
BLOCKED:
NOT RUN:

P0:
P1:
P2:
P3:

Clinical Validation Status:
Deployment Validation Status:
Model Validation Status:

Final Decision:
```

Use factual wording only.

---

# 21. ANTI-GRAVITY EXECUTION COMMAND

Begin now.

**PHASE 0 — DISCOVERY ONLY.**

Do not modify production code.

Reconstruct the frozen Integration baseline, verify the environment, create the UAT plan and evidence schema, then execute controlled validation.

At every phase:

`OBSERVE → TEST → CAPTURE EVIDENCE → CLASSIFY → GATE → DECIDE`

If a hard-stop condition appears, stop.

If a test fails, preserve the failure.

If a test cannot execute, mark `BLOCKED`.

If evidence is inherited, mark `CROSS-VALIDATED`.

If evidence is freshly executed, mark the appropriate `UAT-VERIFIED` or `DEPLOYMENT-VERIFIED`.

If clinical evidence does not exist, explicitly state that it does not exist.

**Never manufacture certainty.**

At completion, produce the evidence-backed final decision and stop.
