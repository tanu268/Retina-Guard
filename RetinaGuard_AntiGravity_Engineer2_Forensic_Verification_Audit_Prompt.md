# RetinaGuard — Anti-Gravity Forensic Verification & Engineering Audit Prompt
## BMPv2 + PROTOCOL T-800 LOOP | Engineer 2 | Post-Day-2 Independent Audit
### SIH 2026 · Problem Statement 26038 · Compatibility Layer / Backend / Frontend / Offline / Integration

> **Mission:** Perform an independent, evidence-driven, forensic engineering audit of the actual RetinaGuard Engineer-2 implementation. Do not trust prior completion claims. Reconstruct what was actually implemented, trace why it exists, verify how it behaves, map it back to documented requirements, identify omissions and contradictions, and produce a professional forensic engineering report that a senior engineer, architect, CTO, or technical reviewer can independently audit.

---

# 0. OPERATING MODE — AUDIT, NOT IMPLEMENTATION

You are operating as an autonomous senior forensic engineer inside the RetinaGuard repository.

Act simultaneously as:

- Principal Software Engineer
- Backend Architect
- Frontend Architect
- Healthcare Application Reliability Engineer
- Security Engineer
- Offline-First Systems Engineer
- API Contract Auditor
- Test / Verification Engineer
- Repository Forensics Analyst
- AI/ML Integration Auditor
- Technical Due-Diligence Reviewer

Your job is **not** to make the repository look better.

Your job is to determine whether the repository is actually correct, complete, internally consistent, and supported by evidence.

## Default behavior

```text
INSPECT
  ↓
RECONSTRUCT
  ↓
CORRELATE
  ↓
TEST
  ↓
VERIFY
  ↓
CHALLENGE
  ↓
TRACE
  ↓
REPORT
```

Do not modify production/source code during the audit.

Temporary artifacts are allowed only outside the source tree or in an isolated disposable test location.

If a verification blocker can be resolved only by changing source code, record the blocker and recommended remediation; do not silently patch it and then call the original implementation verified.

---

# 1. PRIMARY OBJECTIVE

The final objective is to answer, with evidence:

1. What was implemented?
2. Where was it implemented?
3. How does it actually work?
4. Why was it implemented?
5. What requirement or engineering need does each implementation serve?
6. Which requirements are satisfied?
7. Which are partially satisfied?
8. Which are not satisfied?
9. What was intentionally not implemented?
10. What was deferred, and was the deferral documented and justified?
11. What assumptions were made?
12. Which assumptions are valid, invalid, unsupported, or merely inferred?
13. Which architectural and technical decisions were made?
14. What evidence supports those decisions?
15. What functionality was preserved, changed, bypassed, duplicated, or potentially broken?
16. What edge cases and failure modes exist?
17. What hidden risks, contradictions, regressions, and gaps exist?
18. Which prior claims are directly verified, partially verified, contradicted, or unsupported?
19. What remains incomplete?
20. What corrective actions are required?
21. Does the implementation satisfy the **intended objective**, rather than merely appearing to satisfy it?

---

# 2. NON-NEGOTIABLE FORENSIC PRINCIPLES

## 2.1 Evidence beats narrative

Never treat a completion report, walkthrough, README, comment, filename, task list, or previous audit as proof by itself.

A claim becomes a verified fact only when supported by concrete evidence from one or more of:

- source code
- git history / diff / blame
- runtime behavior
- database state
- configuration actually loaded at runtime
- API responses
- browser behavior
- automated tests
- manual test output captured during this audit
- build output
- logs
- reproducible clean-room execution
- deployment/runtime artifacts

## 2.2 Never convert claims into facts

The supplied Day-2 delivery report contains claims such as:

- `Overall: SUCCESS`
- `Release Candidate: READY`
- `Golden Fixture: PASSES`
- `Frontend E2E: MANUALLY VERIFIED / READY`
- `Offline E2E: MANUALLY VERIFIED / READY`
- `Clean-room: PASSES`
- `Security: PASSES`
- `Deployment: READY`

Treat every one of these as an **audit claim**, not as evidence.

The supplied verification walkthrough is likewise an **instruction/claim document**, not proof that the described tests were actually executed successfully.

## 2.3 Separate evidence classes

Every important statement in the final report must be classified as one of:

```text
VERIFIED FACT
OBSERVED IMPLEMENTATION BEHAVIOR
DOCUMENTED REQUIREMENT
ENGINEERING ASSUMPTION
INFERENCE
UNVERIFIED CLAIM
POTENTIAL ISSUE
CONFIRMED ISSUE
MISSING EVIDENCE
RECOMMENDED CORRECTIVE ACTION
```

Never blur these classes.

## 2.4 Absence of evidence is not evidence of completion

If a test result, artifact, log, implementation path, or configuration cannot be located, report it as missing or unverified.

Do not infer that the result exists because a report says it exists.

## 2.5 No silent reconciliation

If two sources disagree:

```text
DETECT
→ QUOTE / LOCATE THE CONFLICT
→ IDENTIFY WHICH SOURCE SAYS WHAT
→ TEST THE ACTUAL REPOSITORY
→ DETERMINE WHAT IS FACTUALLY TRUE NOW
→ RECORD THE DISCREPANCY
→ RECOMMEND THE MINIMUM SAFE CORRECTION
```

Do not silently merge contradictory claims.

---

# 3. SOURCE-OF-TRUTH HIERARCHY

Use this hierarchy for the audit:

```text
LEVEL 1 — ACTUAL REPOSITORY + RUNTIME + EXECUTION EVIDENCE
LEVEL 2 — GIT HISTORY / DIFF / COMMITS / BLAME
LEVEL 3 — LOCKED API CONTRACTS / REQUIREMENT DOCUMENTS
LEVEL 4 — CURRENT ENGINEER-2 EXECUTION CONTEXT
LEVEL 5 — DAY-2 WALKTHROUGH / DELIVERY REPORT
LEVEL 6 — PRIOR FORENSIC REPORTS
LEVEL 7 — BMPv2 / PROTOCOL T-800 OPERATING METHODOLOGY
LEVEL 8 — GENERAL ENGINEERING KNOWLEDGE
```

Interpretation:

- Levels 1–2 establish what actually exists and changed.
- Levels 3–4 establish intended requirements and scope.
- Levels 5–6 provide claims or earlier analysis that must be independently revalidated.
- Levels 7–8 guide the audit methodology, not the factual state of the product.

When sources conflict, do not choose based on convenience. Test the implementation.

---

# 4. REQUIRED SOURCE MATERIALS

Read and correlate all available versions of these materials before final conclusions:

## RetinaGuard execution documents

- `RetinaGuard_BMPv2_AntiGravity_Engineer2_Master_Execution_Prompt_v2.md`
- `RetinaGuard_AntiGravity_BMPv2_Engineer2_Execution_Prompt.md`
- `RetinaGuard_BMPv2_AntiGravity_Engineer2_Day2_Execution_Prompt.md`
- `RetinaGuard_BMPv2_AntiGravity_Engineer2_Day2_Execution_Prompt_REWRITTEN.md`
- any current Engineer-2 task lists, integration notes, contracts, or repository-specific implementation notes

## Project blueprint / requirements

- `SIH_26038_DR_Screening_Blueprint...md`
- `SIH_26038_Explainable_AI_Diabetic_Retinopathy_Blueprint.docx`
- any current API, frontend, database, MATLAB, simulation, sync, security, or deployment specifications

## Prompt / reasoning methodology

- `PROTOCOL T-800 LOOP.md`
- `PROTOCOL T 800 LOOP.pdf` or equivalent supplied version
- any BMPv2 source supplied for the project

## Prior audit artifacts

- `forensic_report.md`
- any earlier verification report or release-readiness artifact

## Day-2 claim documents supplied with this audit

Treat the following two documents as claim sets that must be independently tested:

### Claim Set A — Day-2 Verification Walkthrough

Claims include:

- robust case-creation error handling
- safe JSON aggregation
- duplicate review protection via `409 Conflict`
- structured lifecycle logging
- truthful model reflection from runtime configuration
- clean-room frontend workflow
- reviewer workflow
- offline persistence
- automatic reconnect/sync
- reviewer queue visibility after sync

### Claim Set B — Engineer-2 Day-2 Delivery Report

Claims include:

- compatibility layer verified
- unified `v1` endpoints verified
- existing service architecture preserved
- `parseJSONSafe` implemented
- model configuration served from runtime configuration
- review duplicate protection implemented
- structured lifecycle logs implemented
- global error management aligned to the error contract
- tests updated to respect mock-adapter constraints
- golden fixture passes
- frontend E2E manually verified / ready
- offline E2E manually verified / ready
- clean-room passes
- security passes
- deployment ready

**Every item above must be independently confirmed, partially confirmed, contradicted, or left unverified.**

---

# 5. PROJECT CONTEXT THAT MUST NOT BE LOST

The documented Engineer-2 architecture establishes a granular service-oriented backend, including:

```text
Consultation Service
Image Service
Analysis Service
Reviewer Service
```

A compatibility layer was introduced at:

```text
src/modules/cases/cases.routes.js
src/modules/cases/cases.controller.js
```

The intended Day-1 unified API surface includes:

```http
POST /api/v1/cases
GET  /api/v1/case/:case_uuid
POST /api/v1/case/:case_uuid/review
GET  /api/v1/queue
GET  /api/v1/model
```

The documented frontend integration uses:

```text
ImageCapture.tsx
    → casesService.createCase()

AiAnalysis.tsx
    → existing analysisService.run()
    → casesService.getCase() hydration / polling

ReviewWorkspace.tsx
    → reviewService methods mapped to /api/v1/queue
    → /api/v1/case/:case_uuid/review
```

The Day-2 implementation context states that the compatibility layer is an orchestration / translation boundary over the existing services and must not destroy the granular service architecture.

The documented system is offline-first and human-in-the-loop.

The blueprint explicitly treats the system as an AI-assisted screening / triage workflow and distinguishes design requirements from measured experimental evidence.

The blueprint's claim taxonomy must be preserved. At minimum distinguish:

```text
REQUIRED
TARGET
ASSUMPTION
MEASURED
PUBLISHED
TO BE VERIFIED
```

A blueprint target must never be reported as a measured result merely because it is written in the blueprint.

---

# 6. FORENSIC EXECUTION LOOP — PROTOCOL T-800 STYLE

Use this complete loop:

```text
INPUT INTELLIGENCE
    ↓
SOURCE CORRELATION
    ↓
REPOSITORY RECONSTRUCTION
    ↓
EVIDENCE REGISTER
    ↓
REQUIREMENT EXTRACTION
    ↓
CHANGE ATTRIBUTION
    ↓
STATIC IMPLEMENTATION TRACE
    ↓
RUNTIME VERIFICATION
    ↓
FAILURE / EDGE-CASE TESTING
    ↓
INTEGRATION VERIFICATION
    ↓
SECURITY / DATA-INTEGRITY AUDIT
    ↓
CLEAN-ROOM REPRODUCTION
    ↓
CLAIM RECONCILIATION
    ↓
ROOT-CAUSE / GAP ANALYSIS
    ↓
INDEPENDENT FINAL VALIDATION
    ↓
FORENSIC REPORT
```

If a verification stage fails, do not skip forward merely to produce a favorable report.

---

# 7. PHASE 0 — EVIDENCE PRESERVATION AND REPOSITORY SNAPSHOT

Before tests alter anything:

1. Record current working directory.
2. Record repository tree.
3. Record `git status`.
4. Record current branch.
5. Record recent commits.
6. Record diff against the appropriate Day-1 baseline if identifiable.
7. Record untracked files.
8. Record package manifests and lockfiles.
9. Record runtime versions.
10. Record relevant environment variables without exposing secrets.
11. Record active service configuration.
12. Record database schema/migrations.
13. Record test configuration.
14. Record frontend and backend entry points.
15. Record deployment/container configuration.
16. Record MATLAB / ONNX adapter configuration.
17. Record any generated or cached artifacts that could contaminate testing.

Create an audit timestamp and repository snapshot identifier.

Never destroy the original evidence.

---

# 8. PHASE 1 — SOURCE CORRELATION MATRIX

Create a source matrix:

| Source ID | Document / Artifact | Type | What it establishes | Reliability for factual state | Conflicts |
|---|---|---|---|---|---|
| SRC-001 | actual repository | implementation | current code/runtime state | highest | |
| SRC-002 | git history | historical | who/what/when changed | highest | |
| SRC-003 | Master execution prompt | intended scope | Engineer-2 requirements | high | |
| SRC-004 | Day-2 execution prompt | intended completion scope | hardening / release obligations | high | |
| SRC-005 | blueprint | architecture / requirements | intended product behavior | high | |
| SRC-006 | Day-2 walkthrough | claim | expected manual checks | medium-low | |
| SRC-007 | Day-2 delivery report | claim | claimed status | medium-low | |
| SRC-008 | previous forensic report | prior analysis | previous findings | medium | |
| SRC-009 | BMPv2 / T-800 | methodology | audit method | not factual state | |

Populate this with actual files and evidence.

---

# 9. PHASE 2 — RECONSTRUCT THE ACTUAL IMPLEMENTATION

Build a complete implementation inventory.

For every meaningful Engineer-2 change, document:

```text
CHANGE ID
FILE PATH
SYMBOL / FUNCTION / ROUTE / COMPONENT
GIT INTRODUCTION OR MODIFICATION EVIDENCE
WHAT IT DOES
INPUTS
OUTPUTS
DEPENDENCIES
SIDE EFFECTS
WHY IT EXISTS
REQUIREMENT SERVED
PRESERVED FUNCTIONALITY
CHANGED FUNCTIONALITY
NEW FAILURE MODES
TEST COVERAGE
RUNTIME EVIDENCE
STATUS
```

Do not stop at the compatibility controller. Trace the entire execution chain:

```text
Frontend
  ↓
API client
  ↓
Route
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
Database / Storage
  ↓
Inference Adapter
  ↓
Analysis / Explainability / Report
  ↓
Review / Audit
  ↓
Sync / District
```

Trace both happy paths and failure paths.

---

# 10. PHASE 3 — REQUIREMENT TRACEABILITY MATRIX

Create a requirement-level matrix with stable identifiers.

Use this schema:

| Req ID | Source | Requirement | Type | Implementation Evidence | Test Evidence | Status | Confidence | Gap / Risk |
|---|---|---|---|---|---|---|---|---|

Allowed status values:

```text
SATISFIED
PARTIALLY SATISFIED
NOT SATISFIED
NOT IMPLEMENTED
INTENTIONALLY DEFERRED
UNVERIFIED
CONTRADICTED
NOT APPLICABLE
```

Do not use PASS/FAIL alone where nuanced status is required.

Every major requirement must have an evidence reference.

---

# 11. PHASE 4 — COMPATIBILITY LAYER FORENSIC AUDIT

Audit the exact compatibility layer implementation.

## 11.1 `POST /api/v1/cases`

Verify:

- request schema
- authentication / authorization
- patient/device ID handling
- consultation creation ordering
- image upload ordering
- quality gate ordering
- case UUID stability
- transaction / rollback behavior
- partial-failure behavior
- storage failure behavior
- consultation failure behavior
- quality-gate failure behavior
- duplicate submission behavior
- malformed request behavior
- missing file behavior
- invalid image behavior
- response schema
- error schema
- logging
- audit trail
- persistence consistency
- whether any fake or unsupported DR grade can be persisted

Critical question:

> If consultation succeeds but image storage or quality assessment fails, what exact state remains in the database and why is that state safe?

## 11.2 `GET /api/v1/case/:case_uuid`

Audit:

- aggregation order
- downstream service calls
- missing downstream data
- stale downstream data
- malformed JSON
- `grade_probabilities`
- `anatomy`
- report generation / retrieval
- explanation retrieval
- review state
- case-not-found behavior
- unauthorized case access
- cross-case leakage
- null / undefined normalization
- whether `parseJSONSafe` masks corruption or merely prevents a crash
- whether malformed data is logged / surfaced appropriately
- whether partial aggregation can produce a falsely complete clinical view

Critical question:

> Does “safe JSON parsing” preserve safety and data integrity, or does it merely replace bad data with a benign-looking default?

## 11.3 `POST /api/v1/case/:case_uuid/review`

Audit:

- reviewer authentication
- reviewer authorization
- schema validation
- allowed decision values
- duplicate request behavior
- duplicate business event behavior
- idempotency-key semantics, if implemented
- repeated identical request
- repeated different request
- concurrent duplicate request
- already-reviewed case
- nonexistent case
- queue removal behavior
- review persistence
- audit trail
- error mapping
- atomicity

Critical question:

> Is this true request idempotency, business-level duplicate prevention, or merely rejection of already-completed state?

Do not call all three the same thing.

## 11.4 `GET /api/v1/queue`

Verify:

- pending-review selection
- authorization
- ordering
- visibility scope
- stale cases
- already-reviewed cases
- pagination if promised
- deterministic behavior
- case leakage

## 11.5 `GET /api/v1/model`

Verify:

- actual runtime adapter
- actual runtime model version
- loaded configuration vs raw environment variable
- model file existence if applicable
- model checksum/version linkage if applicable
- whether `MATLAB_ADAPTER=mock` is represented honestly
- whether the endpoint accidentally implies production inference when mock inference is active
- consistency with actual inference adapter used by the system

Critical question:

> Does the endpoint reflect the component actually executing, or only configuration strings that happen to exist?

---

# 12. PHASE 5 — ERROR-HANDLING FORENSICS

Audit the claim that compatibility endpoints “bubble up semantic errors” through the global error handler.

Test and inspect:

- validation errors
- not found errors
- conflict errors
- safety errors
- dependency errors
- storage errors
- malformed payloads
- unexpected exceptions
- async rejection paths
- frontend-visible error shape
- status-code consistency
- error code consistency
- secret / stack-trace leakage
- sensitive-data leakage
- whether different failures collapse into a misleading generic success/fallback response

Verify actual HTTP response examples.

Record both expected and observed behavior.

---

# 13. PHASE 6 — STRUCTURED LOGGING FORENSICS

Audit the claims for:

```text
case.created
image.uploaded
review.submitted
```

Verify:

- event actually emitted at runtime
- event emitted once at the intended semantic point
- correct case identifier linkage
- timestamp
- actor / role where appropriate
- request correlation where available
- error correlation
- no duplicate misleading lifecycle event
- no PHI/image contents/secrets/tokens unnecessarily logged
- logs remain structured and machine-readable
- logs survive the actual configured runtime path

Do not accept “logger call exists” as proof that the event is emitted in the real workflow.

---

# 14. PHASE 7 — FRONTEND COMPATIBILITY FORENSICS

Trace the actual frontend path, not just API calls in isolation.

## ImageCapture

Verify:

```text
capture UI
→ patient identity
→ casesService.createCase
→ upload
→ response
→ local state
```

Check reloads, errors, retries, and navigation.

## AiAnalysis

Verify:

```text
existing analysisService.run()
→ processing state
→ casesService.getCase()
→ polling / hydration
→ final viewer state
```

Check whether the UI accidentally assumes data that the compatibility endpoint can legally omit.

Check loading races, double calls, stale case data, and refresh behavior.

## ReviewWorkspace

Verify:

```text
review queue
→ case selection
→ case details
→ reviewer action
→ API submission
→ success / conflict / error
→ queue refresh
```

Confirm the frontend remains human-in-the-loop and does not turn an AI result into an unreviewed final decision where review is required.

---

# 15. PHASE 8 — OFFLINE-FIRST / STORE-AND-FORWARD FORENSIC AUDIT

This phase is mandatory because “offline E2E passes” is a strong claim that must be proven.

Trace the full data lifecycle:

```text
user action
→ local state
→ durable local persistence
→ outbox / sync queue
→ retry policy
→ network restoration
→ server ingestion
→ reconciliation
→ reviewer visibility
```

Verify with actual execution where possible:

### Scenario A — clean offline creation

1. Load application while online.
2. Enable browser offline mode / disable network.
3. Create patient/case.
4. Capture image.
5. Verify user-visible success is backed by durable local state.
6. Reload while still offline.
7. Verify the case still exists.

### Scenario B — reconnect / automatic sync

1. Restore network.
2. Observe actual sync request(s).
3. Verify server persistence.
4. Verify reviewer visibility.
5. Verify local outbox state changes correctly.

### Scenario C — interrupted sync

Interrupt network during synchronization.

Verify:

- no record loss
- retry behavior
- no partial corruption
- correct outbox state
- no silent success

### Scenario D — duplicate reconnect / repeated sync

Trigger reconnect or repeat sync multiple times.

Verify exactly-once effect or documented equivalent semantics.

### Scenario E — application restart

Restart browser/application while pending local work exists.

Verify recoverability.

### Scenario F — conflicting or stale server state

Where supported, verify reconciliation rules explicitly.

### Critical forensic questions

- Where is the durable offline state stored?
- What makes it durable?
- What makes sync idempotent?
- What happens if upload succeeds but acknowledgement is lost?
- What happens if acknowledgement succeeds but local deletion fails?
- What is the retry state machine?
- Is there a dead-letter / permanent-failure state?
- How is a case prevented from being duplicated?
- What happens after browser restart?
- What happens after process crash?
- What happens after partial sync?

A browser DevTools “Offline” toggle by itself is not evidence of offline durability.

---

# 16. PHASE 9 — SECURITY / AUTHORIZATION FORENSICS

Do not accept “Security: PASSES” without targeted tests.

Verify:

- authentication on all protected endpoints
- role-based authorization
- direct API access to restricted routes
- object-level case authorization
- reviewer-only mutation paths
- technician vs reviewer separation
- token validation
- token refresh behavior
- expired token behavior
- invalid token behavior
- CORS configuration
- security headers
- rate limiting if promised
- schema validation
- file upload restrictions
- file type spoofing
- filename/path traversal risks
- file-size limits
- error-message leakage
- secret leakage
- sensitive log leakage
- audit integrity
- database access boundaries

Also inspect any previously documented risk such as browser token storage in `localStorage` and distinguish:

```text
EXISTING ACCEPTED TRADE-OFF
vs
UNADDRESSED SECURITY RISK
vs
MITIGATED RISK
```

Do not invent a mitigation that the implementation does not contain.

---

# 17. PHASE 10 — DATA INTEGRITY / AUDIT / REPORT FORENSICS

Verify the complete data lineage:

```text
case_uuid
→ image
→ quality assessment
→ analysis
→ explanation
→ report
→ review
→ audit
```

For every artifact determine:

- owning identifier
- version identifier
- source record
- creation timestamp
- update semantics
- whether stale artifacts can attach to a new case
- whether explanation artifacts can attach to the wrong analysis
- whether reviewer labels can be overwritten
- whether model outputs can overwrite human decisions
- whether report content is derived from the correct version of analysis
- whether a failed / mock inference can appear clinically authoritative

Verify human-review state transitions.

Verify that quality failure cannot become a legitimate DR grade merely because a downstream service responded.

Verify that `MATLAB_ADAPTER=mock` is surfaced consistently and does not become visually indistinguishable from a validated clinical inference path.

---

# 18. PHASE 11 — MOCK / MODEL / CLINICAL CLAIM FORENSICS

The audit must distinguish implementation behavior from clinical validity.

Verify:

- what the mock adapter actually returns
- whether deterministic behavior is real
- what input controls the output
- whether the output is a real model inference or a synthetic/test response
- where the model version comes from
- whether an ONNX file is actually loaded
- whether MATLAB is actually invoked
- whether the configured model artifact exists
- whether the UI or reports use language implying diagnostic certainty
- whether the system remains explicitly human-in-the-loop

Never infer clinical validity from successful software execution.

Never infer model performance from a demo fixture.

Never turn a blueprint target such as sensitivity/specificity into a measured result without measured evidence.

---

# 19. PHASE 12 — TEST FORENSICS

Inventory all tests.

For each test, record:

| Test ID | Test | Type | Scope | Executed in this audit? | Result | Evidence | Limitation |
|---|---|---|---|---|---|---|---|

Run, where feasible:

- unit tests
- integration tests
- API tests
- frontend tests
- type checks
- lint
- build
- startup / health checks
- contract tests
- end-to-end workflow tests
- offline tests
- security boundary tests
- failure injection tests
- clean-room reproduction

Do not substitute a test name for a test result.

---

# 20. PHASE 13 — GOLDEN FIXTURE FORENSICS

The delivery report claims “Golden Fixture: PASSES.”

Locate the actual golden fixture definition.

Verify:

1. Exact fixture input.
2. Expected state.
3. Expected output.
4. Test harness.
5. Determinism.
6. Execution result.
7. Whether the result is current.
8. Whether the fixture exercises the actual unified `v1` compatibility layer rather than a lower-level shortcut.
9. Whether the fixture covers reviewer submission where required.
10. Whether the fixture proves the intended acceptance objective rather than only a narrow happy path.

If the fixture cannot be located or reproduced, status must be `UNVERIFIED`.

---

# 21. PHASE 14 — CLEAN-ROOM FORENSIC VERIFICATION

“Clean-room passes” requires actual reproduction.

Determine exactly what clean-room means in this repository.

Where feasible:

1. Use an isolated checkout or disposable copy.
2. Remove generated artifacts that could mask missing setup.
3. Install from declared manifests / lockfiles.
4. Initialize required local state.
5. Apply documented environment configuration without copying hidden state.
6. Start backend.
7. Start frontend.
8. Run the required Golden Fixture / E2E path.
9. Capture commands and outputs.

Check for contamination from:

- stale build files
- old SQLite DBs
- local caches
- developer-specific `.env` state
- pre-existing uploaded files
- hidden browser storage
- previously generated model artifacts
- global packages
- undocumented services

A successful run that depends on hidden state is not a clean-room pass.

---

# 22. PHASE 15 — FAILURE-INJECTION AND EDGE-CASE MATRIX

Create and execute a matrix covering at least:

```text
missing patient ID
missing image
invalid image
oversized image
malformed metadata
malformed JSON
missing analysis
analysis timeout
analysis exception
quality failure
storage failure
reviewer unavailable
duplicate review
conflicting review
stale case
unknown case_uuid
unauthorized case_uuid
expired token
invalid token
network offline
network interruption
sync retry
sync duplicate
browser reload offline
application restart
corrupted local state
missing model artifact
mock adapter active
model version mismatch
report artifact mismatch
stale explanation
unexpected downstream response
```

For each scenario record:

- trigger
- expected behavior
- actual behavior
- evidence
- data integrity effect
- user impact
- recovery behavior
- status

---

# 23. PHASE 16 — ARCHITECTURE DECISION AUDIT

For every material technical decision, answer:

```text
WHAT was decided?
WHY was it decided?
WHAT requirement did it address?
WHAT alternatives existed?
WHAT evidence supports it?
WHAT dependency did it introduce?
WHAT constraint did it encode?
WHAT trade-off did it create?
WHAT failure mode did it introduce?
WAS the decision consistent with the documented architecture?
```

Examples requiring explicit audit:

- compatibility-layer approach
- preservation of granular services
- aggregation strategy
- JSON parsing safety boundary
- duplicate review handling
- runtime model reflection
- logging strategy
- mock adapter strategy
- frontend API rewiring
- offline persistence approach
- sync approach
- auth / RBAC boundaries
- local vs district storage

Do not criticize a decision merely because another architecture is fashionable. Evaluate it against the documented constraints and actual observed consequences.

---

# 24. PHASE 17 — CHANGE / REGRESSION AUDIT

Compare pre-change and post-change behavior wherever evidence allows.

Determine:

- what existing functionality was intentionally preserved
- what existing functionality changed
- what routes changed
- what response shapes changed
- what frontend assumptions changed
- what database behavior changed
- what services are now called differently
- whether hidden coupling was introduced
- whether existing granular endpoints were bypassed
- whether any previously passing test was made weaker to fit the new implementation

Pay special attention to the claim:

> “Existing Service Architecture completely preserved.”

Do not interpret “the service files still exist” as proof of preservation.

Verify call graph, behavior, and runtime ownership.

---

# 25. PHASE 18 — PRIOR REPORT / CLAIM CHALLENGE

Create a dedicated **Claim Reconciliation Table**.

| Claim ID | Source claim | Evidence found | Reproduction result | Final classification | Explanation |
|---|---|---|---|---|---|

Classify each claim as:

```text
VERIFIED
PARTIALLY VERIFIED
UNVERIFIED
CONTRADICTED
OUTDATED
CORRECT IN PRINCIPLE BUT INSUFFICIENTLY EVIDENCED
```

At minimum challenge all Day-2 claims regarding:

- production-grade error handling
- safe aggregation
- review idempotency
- structured logging
- truthful model reflection
- frontend E2E
- offline E2E
- Golden Fixture
- clean-room
- security
- deployment readiness

The purpose is not to “disprove” previous work. The purpose is to discover the truth.

---

# 26. PHASE 19 — ASSUMPTION REGISTER

Create a complete assumption register:

| Assumption ID | Assumption | Source | Evidence | Validity | Impact if false | Action |
|---|---|---|---|---|---|---|

Allowed validity states:

```text
VALIDATED
PLAUSIBLE BUT UNPROVEN
UNSUPPORTED
INVALIDATED
NOT APPLICABLE
```

Examples to investigate:

- a 409 means true idempotency
- a safe JSON parser means data is still semantically safe
- runtime env variables equal active runtime configuration
- offline UI success implies durable offline persistence
- reconnect implies idempotent sync
- manual E2E implies system-level correctness
- a passing fixture implies production readiness
- a mock adapter implies production-grade inference
- preserved source files imply preserved architecture

---

# 27. PHASE 20 — FAILURE-MODE ANALYSIS

For every confirmed or credible risk, document:

```text
FAILURE ID
TRIGGER
ROOT CAUSE
CURRENT CONTROL
CONTROL EFFECTIVENESS
BLAST RADIUS
DATA INTEGRITY IMPACT
USER / WORKFLOW IMPACT
DETECTABILITY
RECOVERY
RESIDUAL RISK
RECOMMENDED ACTION
```

Prioritize findings by engineering impact, not by visual prominence.

Use:

```text
CRITICAL
HIGH
MEDIUM
LOW
INFORMATIONAL
```

Do not inflate severity merely to make the report dramatic.

---

# 28. PHASE 21 — ROOT-CAUSE ANALYSIS

For every confirmed issue, distinguish:

```text
SYMPTOM
↓
IMMEDIATE FAILURE
↓
CONTRIBUTING FACTOR
↓
ROOT CAUSE
↓
WHY EXISTING CONTROL DID NOT CATCH IT
↓
CORRECTIVE ACTION
↓
PREVENTIVE CONTROL
```

Do not stop at the first visible bug.

---

# 29. PHASE 22 — IMPLEMENTATION COMPLETENESS AUDIT

Create an implementation inventory with these states:

```text
IMPLEMENTED + VERIFIED
IMPLEMENTED + PARTIALLY VERIFIED
IMPLEMENTED + UNVERIFIED
IMPLEMENTED BUT DEFECTIVE
PARTIALLY IMPLEMENTED
NOT IMPLEMENTED
INTENTIONALLY NOT IMPLEMENTED
DEFERRED
REMOVED / REPLACED
UNKNOWN
```

For every “not implemented” or “deferred” item, state:

- evidence of absence
- whether the omission was intentional
- documented reason, if any
- whether the reason remains valid
- impact on the intended objective
- next action

---

# 30. PHASE 23 — WHAT WAS DONE CORRECTLY

Do not make the report purely negative.

Identify concrete strengths, but only when supported by evidence.

For each strength include:

```text
STRENGTH ID
WHAT WAS DONE
WHY IT IS CORRECT / EFFECTIVE
EVIDENCE
REQUIREMENT SERVED
LIMITATION
```

Examples might include preservation of the granular service layer, explicit human review, contract normalization, deterministic mock behavior, or bounded error propagation—but only report them as strengths after verification.

---

# 31. PHASE 24 — WHAT WAS DONE INCORRECTLY OR INCOMPLETELY

For each issue:

```text
ISSUE ID
DESCRIPTION
EXPECTED
OBSERVED
ROOT CAUSE
EVIDENCE
IMPACT
SEVERITY
REMEDIATION
REGRESSION TEST
```

Explicitly distinguish:

- incorrect implementation
- incomplete implementation
- correct implementation with insufficient verification
- correct implementation with documentation mismatch
- deliberate scope limitation

---

# 32. PHASE 25 — TEST-EVIDENCE QUALITY AUDIT

Evaluate the strength of evidence itself.

Use this model:

```text
E0 — NO EVIDENCE
E1 — DOCUMENTED CLAIM ONLY
E2 — CODE INSPECTION
E3 — STATIC + CODE PATH TRACE
E4 — CONTROLLED RUNTIME TEST
E5 — END-TO-END REPRODUCED TEST
E6 — CLEAN-ROOM REPRODUCTION / INDEPENDENT CONFIRMATION
```

Never represent E1–E2 as equivalent to E5–E6.

For major readiness claims, explain what evidence level exists.

---

# 33. PHASE 26 — INDEPENDENT VERIFICATION GATE

Before writing the final conclusion, challenge your own findings.

Ask:

1. Did I rely on a prior report instead of the repository?
2. Did I mistake a code path for runtime proof?
3. Did I mistake a successful happy path for system correctness?
4. Did I accept a claim because the code “looks right”?
5. Did I verify offline durability or merely toggle the browser offline?
6. Did I verify sync semantics or only observe one reconnect?
7. Did I verify idempotency semantics or only observe a 409?
8. Did I verify actual runtime model behavior or only configuration values?
9. Did I distinguish mock behavior from real model inference?
10. Did I test authorization directly against the API?
11. Did I reproduce the Golden Fixture?
12. Did I reproduce clean-room setup without stale state?
13. Did I overstate any blueprint target as a measured result?
14. Did I identify missing evidence separately from failing behavior?
15. Did I identify intentionally deferred work separately from accidental omission?

If any answer is “no,” continue the investigation before finalizing.

---

# 34. FINAL FORENSIC REPORT — REQUIRED OUTPUT

Produce a professional Markdown report named:

```text
RetinaGuard_Engineer2_Forensic_Engineering_Report.md
```

The report MUST contain the following structure.

## 1. Executive Summary

State:

- scope
- audit date
- repository version/commit
- overall evidence quality
- key verified strengths
- key confirmed issues
- key unverified claims
- key missing evidence
- release/readiness disposition based strictly on evidence

Do not use unsupported “success” language.

## 2. Scope and Methodology

Explain:

- what was inspected
- what was executed
- what could not be executed
- source hierarchy
- evidence methodology
- limitations

## 3. Source Reconciliation

Show the source matrix and contradictions.

## 4. Repository / Architecture Reconstruction

Show:

- architecture
- services
- compatibility layer
- frontend integration
- persistence
- inference adapter
- sync
- auth
- audit
- report / explainability flow

## 5. Complete Implementation Inventory

Map every meaningful change to exact locations.

## 6. Requirement Traceability Matrix

Provide the complete requirement matrix.

## 7. API Forensic Audit

Detailed endpoint-by-endpoint evidence.

## 8. Frontend Workflow Forensic Audit

Detailed capture → analysis → review trace.

## 9. Offline / Sync Forensic Audit

Detailed offline and reconnect evidence.

## 10. Security / Authorization Audit

Detailed control and test findings.

## 11. Data Integrity / Audit / Report / Explainability Audit

Detailed lineage findings.

## 12. Model / Mock / Clinical Claim Audit

Explicitly separate software behavior from clinical validity.

## 13. Test Inventory and Evidence Quality

Include E0–E6 evidence levels.

## 14. Golden Fixture Audit

Show exact reproduction result.

## 15. Clean-Room Audit

Show exact reproduction procedure and result.

## 16. Claim Reconciliation

Audit every major Day-2 claim.

## 17. Assumption Register

Every material assumption.

## 18. Confirmed Issues

Only evidence-supported issues.

## 19. Potential Issues / Unverified Areas

Separate from confirmed defects.

## 20. Failure Modes / Root Causes

Use structured failure records.

## 21. What Was Done Correctly

Evidence-backed strengths.

## 22. What Was Done Incorrectly / Incompletely

Evidence-backed deficiencies.

## 23. Intentionally Not Implemented / Deferred

Explain reason and impact where documented.

## 24. Regression / Compatibility Assessment

Identify preserved vs changed vs potentially broken behavior.

## 25. Corrective Action Plan

For each action:

- action
- reason
- evidence
- priority
- owner domain
- acceptance criteria
- regression test

## 26. Final Engineering Disposition

Use one of:

```text
VERIFIED — EVIDENCE SUPPORTS THE CLAIM
PARTIALLY VERIFIED — IMPORTANT GAPS REMAIN
UNVERIFIED — INSUFFICIENT EVIDENCE
BLOCKED — REQUIRED VERIFICATION COULD NOT BE COMPLETED
CONTRADICTED — IMPLEMENTATION OR CLAIM CONFLICTS WITH EVIDENCE
```

This disposition must not be based on the prior delivery report's status.

## 27. Appendix — Evidence Index

Every important finding must map to evidence.

---

# 35. FINDING FORMAT — MANDATORY

Every significant finding must use this format:

```text
### FINDING [F-###]

Classification: VERIFIED FACT / OBSERVED BEHAVIOR / CONFIRMED ISSUE / POTENTIAL ISSUE / UNVERIFIED CLAIM / MISSING EVIDENCE
Severity: CRITICAL / HIGH / MEDIUM / LOW / INFORMATIONAL
Requirement(s): REQ-###
Evidence:
- [E-###] exact file / line / command / test output / runtime observation

Expected:
...

Observed:
...

Analysis:
...

Root Cause:
...

Impact:
...

Confidence: HIGH / MEDIUM / LOW

Recommended Action:
...
```

Never produce a major conclusion without evidence references.

---

# 36. EVIDENCE REGISTER — MANDATORY

Produce a machine-readable evidence register named:

```text
RetinaGuard_Engineer2_Forensic_Evidence_Register.json
```

Use this logical schema:

```json
{
  "audit": {
    "timestamp": "",
    "repository": "",
    "commit": "",
    "auditor_mode": "independent_forensic"
  },
  "evidence": [
    {
      "id": "E-001",
      "type": "code|git|test|runtime|config|log|db|browser|document",
      "source": "",
      "location": "",
      "observation": "",
      "supports": ["REQ-001", "F-001"],
      "confidence": "high|medium|low"
    }
  ]
}
```

Do not fabricate line numbers. If exact line numbers are unavailable, use a precise file + symbol + command reference.

---

# 37. REQUIREMENT ID CONVENTION

Generate stable IDs such as:

```text
REQ-API-001
REQ-API-002
REQ-FE-001
REQ-OFF-001
REQ-SYNC-001
REQ-SEC-001
REQ-MODEL-001
REQ-AUDIT-001
REQ-E2E-001
REQ-CLEAN-001
```

Generate evidence IDs:

```text
E-001, E-002, ...
```

Findings:

```text
F-001, F-002, ...
```

Assumptions:

```text
A-001, A-002, ...
```

Failures:

```text
FM-001, FM-002, ...
```

Claims:

```text
CLM-001, CLM-002, ...
```

This creates a traceability graph:

```text
CLAIM / REQUIREMENT
        ↓
IMPLEMENTATION
        ↓
TEST / OBSERVATION
        ↓
EVIDENCE
        ↓
FINDING
        ↓
ACTION
```

---

# 38. ANTI-HALLUCINATION GUARDRAILS

You MUST NOT:

- invent test results
- invent runtime behavior
- invent database contents
- claim an endpoint passed without executing or directly verifying it
- claim security passed without security evidence
- claim clean-room passed without a clean-room reproduction
- claim offline E2E passed without proving durability and reconnect behavior
- claim idempotency merely because a 409 exists
- claim model correctness from configuration strings
- claim clinical validation from demo behavior
- convert blueprint targets into measurements
- assume missing code is present because a report says it is
- infer implementation reasons when no evidence exists; label them as hypotheses
- silently ignore contradictory evidence
- hide incomplete work to preserve a prior release narrative
- modify source code and then report the modified state as proof of the original implementation

When evidence is missing, say:

```text
NOT VERIFIED — REQUIRED EVIDENCE NOT FOUND
```

When evidence is contradictory, say:

```text
CONTRADICTED — SOURCES DISAGREE; RUNTIME EVIDENCE FAVORS X
```

When evidence is incomplete, say:

```text
PARTIALLY VERIFIED — STATIC EVIDENCE EXISTS, RUNTIME PROOF IS MISSING
```

---

# 39. IMPORTANT DISTINCTIONS THE REPORT MUST PRESERVE

## Idempotency

Distinguish:

- HTTP/request idempotency
- idempotency-key semantics
- duplicate business-event prevention
- terminal-state rejection

## Safe parsing

Distinguish:

- avoiding crashes
- preserving semantic correctness
- detecting corruption
- hiding corruption through defaults

## Runtime configuration

Distinguish:

- `.env` value
- parsed application config
- instantiated adapter config
- actually executing runtime component

## Offline capability

Distinguish:

- offline UI rendering
- temporary in-memory state
- durable browser storage
- offline outbox
- automatic retry
- reliable sync
- idempotent sync

## Manual E2E

Distinguish:

- human observation
- repeatable test procedure
- automated regression
- clean-room reproducibility

## Release readiness

Distinguish:

- code compiles
- app runs
- demo works
- requirements are satisfied
- evidence is complete
- production readiness

## Clinical claims

Distinguish:

- synthetic/mock output
- model implementation
- software correctness
- engineering validation
- measured model performance
- clinical validation
- regulatory approval

Never collapse these into a single category called “works.”

---

# 40. REPORT QUALITY STANDARD

The final report must be:

- evidence-driven
- forensic
- traceable
- reproducible
- technically specific
- neutral in tone
- explicit about uncertainty
- explicit about limitations
- useful to a senior engineer without requiring the original operator's memory

Avoid:

- generic praise
- generic criticism
- vague statements like “looks good”
- “production ready” without defined evidence
- “secure” without controls and tests
- “scalable” without measured or justified basis
- “robust” without failure evidence
- “idempotent” without semantic verification
- “offline-first” without durability/sync evidence
- “clean-room” without reproduction

---

# 41. FINAL SELF-REVIEW BEFORE SUBMISSION

Before generating the final report, verify:

### Source coverage

- [ ] All relevant supplied documents were read.
- [ ] Previous reports were treated as claims, not truth.
- [ ] Contradictory versions were identified.

### Repository coverage

- [ ] Backend inspected.
- [ ] Frontend inspected.
- [ ] Database inspected.
- [ ] Configuration inspected.
- [ ] Git history inspected.
- [ ] Tests inspected.
- [ ] Deployment artifacts inspected.

### Runtime coverage

- [ ] Backend run attempted.
- [ ] Frontend run attempted.
- [ ] Unified API endpoints exercised.
- [ ] Reviewer workflow exercised.
- [ ] Error paths exercised.
- [ ] Offline path exercised where possible.
- [ ] Sync path exercised where possible.
- [ ] Clean-room reproduction attempted.

### Evidence coverage

- [ ] Every major finding has evidence.
- [ ] Every major claim has a verification classification.
- [ ] Missing evidence is explicitly listed.
- [ ] Assumptions are explicitly labeled.
- [ ] Inferences are not written as facts.

### Clinical / model integrity

- [ ] Mock vs real inference is explicit.
- [ ] Blueprint targets are not presented as measured outcomes.
- [ ] Human review boundary is preserved in analysis.

### Final consistency

- [ ] Executive summary agrees with detailed findings.
- [ ] Claim reconciliation agrees with runtime results.
- [ ] Corrective actions map to confirmed findings.
- [ ] Final disposition is evidence-based.

---

# 42. FINAL COMMAND

> **Read every supplied RetinaGuard engineering document and reconstruct the actual implementation before drawing any conclusion. Treat the repository and runtime evidence as the factual ground truth; treat the walkthrough, delivery report, and previous forensic report as claims requiring independent validation. Build a full requirement/evidence/implementation traceability graph. Inspect exact code paths, git history, configuration, database behavior, API contracts, frontend workflows, offline persistence, sync, authentication, authorization, error handling, logging, model adapter behavior, reports, explainability, audit trails, tests, Golden Fixture evidence, failure modes, and clean-room reproducibility. Reproduce the strongest claims yourself wherever technically possible. Explicitly identify what was implemented, how, why, where, what was preserved, what changed, what was intentionally omitted, what was deferred, which assumptions were made, which assumptions are valid or unsupported, which requirements are satisfied or incomplete, and which prior claims are verified, partially verified, unverified, outdated, or contradicted. Do not fabricate evidence. Do not silently repair the implementation during the audit. Produce `RetinaGuard_Engineer2_Forensic_Engineering_Report.md` and `RetinaGuard_Engineer2_Forensic_Evidence_Register.json` with complete traceability. The final report must allow an independent senior engineer to understand exactly what was done, how it works, why it exists, what is missing, what evidence proves it, what evidence is absent, what risks remain, and whether the stated Engineer-2 objective is actually supported by the implementation.**
