# RetinaGuard — FINAL EVIDENCE CLOSURE & RELEASE CANDIDATE VERIFICATION

## Engineer 2 · Final Gate
### SIH 2026 · Problem Statement 26038
### BMPv2 + Protocol T-800
### Post-Forensic Hardening · Runtime Verification · Evidence Closure

---

# 0. MISSION

The Engineer 2 backend hardening cycle has already been executed.

The current implementation includes:

- unified `/api/v1` compatibility endpoints
- race-safe review idempotency
- parser observability
- failure-path logging
- runtime model configuration reflection
- backend integration tests
- concurrency verification
- parser verification
- failure logging verification
- model configuration verification
- backend authorization verification
- Golden Fixture-related verification
- clean-room dependency/test verification

However, the previous execution explicitly skipped full browser-based frontend E2E because introducing a permanent heavy browser framework was considered unjustified.

Therefore, the next task is **NOT another broad refactor**.

The mission is:

> **Close the remaining evidence gaps, verify the actual frontend/runtime behavior, reconcile documentation contradictions, capture reproducible evidence, and determine the truthful final release disposition for Engineer 2.**

The objective is **not** to make the project appear complete.

The objective is to make every claim in the engineering report directly supported by evidence.

---

# 1. ABSOLUTE EXECUTION PRINCIPLES

## 1.1 Evidence > Claims

Do not mark anything `VERIFIED` unless direct evidence exists.

Do not infer runtime behavior from source code when runtime verification is required.

Do not infer frontend behavior from backend tests.

Do not infer browser offline behavior from backend synchronization tests.

Do not infer Golden Fixture success from an unrelated test.

## 1.2 No Fabricated Evidence

Never fabricate:

- test results
- HTTP responses
- screenshots
- logs
- timestamps
- database states
- browser results
- synchronization results
- Golden Fixture output
- security results
- performance results

If something could not be tested, explicitly mark it `UNVERIFIED` or `BLOCKED` with the reason.

## 1.3 Preserve the Existing Architecture

Do NOT:

- rebuild the `/api/v1` compatibility layer
- rewrite Consultation/Image/Analysis/Reviewer architecture
- introduce unnecessary microservices
- introduce Kubernetes
- introduce blockchain
- introduce vector databases
- introduce LLM infrastructure
- replace the existing database architecture
- rewrite the React application
- perform blanket dependency upgrades

Only modify implementation when a demonstrated defect, evidence gap, or verification requirement justifies it.

---

# 2. CURRENT VERIFIED BASELINE

Treat the following as the current baseline to be independently verified where required.

## Backend

Existing unified API layer:

```text
POST /api/v1/cases
GET  /api/v1/case/:case_uuid
POST /api/v1/case/:case_uuid/review
GET  /api/v1/queue
GET  /api/v1/model
```

Existing architecture remains granular:

```text
Consultation Service
Image Service
Analysis Service
Reviewer Service
Sync / Offline Infrastructure
        ↓
Unified /api/v1 Compatibility Layer
```

## Existing Hardening

### Review Idempotency

`reviewerService.js` uses database uniqueness protection against concurrent duplicate review submissions.

Expected:

```text
Request A → 200
Request B → 409
```

### Parser Observability

`cases.controller.js` safely handles malformed model/AI JSON and emits:

```text
malformed.json.payload
```

The raw malformed payload must NOT be logged.

### Failure-Path Logging

Reported events include:

```text
case.creation.failed
image.upload.failed
review.duplicate
review.failed
```

### Model Configuration Reflection

`GET /api/v1/model` must reflect actual runtime configuration including:

```text
MATLAB_ADAPTER
MODEL_VERSION
```

---

# 3. PREVIOUS EXECUTION RESULT

The previous Anti-Gravity execution claimed:

- backend hardening completed
- concurrency test passed
- parser test passed
- failure logging test passed
- model configuration test passed
- full backend suite passed
- clean-room dependency installation/test passed
- security verification completed
- Golden Fixture completed
- offline synchronization verified

But it explicitly stated:

> Full Playwright/browser E2E verification was skipped.

Therefore:

```text
Backend offline sync test
        ≠
Browser offline-first E2E
```

and:

```text
Backend integration test
        ≠
Frontend browser E2E
```

These distinctions are mandatory.

---

# 4. PRIMARY REMAINING GAPS

## GAP-001 — Frontend Browser E2E

Verify the actual React application rather than only service/integration layers.

## GAP-002 — Technician UI Flow

Verify:

```text
Technician
→ Capture
→ Patient/context
→ Image
→ Create Case
→ Analysis
→ Case state
```

## GAP-003 — Reviewer UI Flow

Verify:

```text
Reviewer
→ Queue
→ Open Case
→ View Image
→ View AI Result
→ Review
→ Submit
→ Persist
```

## GAP-004 — Browser Offline Persistence

Verify actual browser behavior while network connectivity is unavailable:

```text
Offline
→ Capture/Create
→ Persist locally
→ Reload
→ Data survives
```

## GAP-005 — Browser Reconnect / Synchronization

Verify:

```text
Offline case
      ↓
Network restored
      ↓
Sync
      ↓
Backend
      ↓
Deduplication
      ↓
Reviewer queue
```

## GAP-006 — Evidence/Documentation Reconciliation

The previous output contains contradictory documentation status.

The narrative says:

```text
Evidence Register updated
Engineering Report updated
```

while the checklist reportedly showed:

```text
Phase 8 Evidence Register [ ]
Phase 8 Engineering Report [ ]
```

Determine the actual filesystem state.

Never trust the narrative over the repository.

---

# 5. PHASE 0 — REPOSITORY FORENSIC RECONSTRUCTION

Before modifying anything, inspect:

```text
backend repository
frontend repository
git status
git diff
package.json
package-lock.json
test configuration
integration tests
frontend test configuration
current evidence register
current engineering report
task.md
```

Also identify:

- current branch/commit state
- modified files
- newly created test files
- existing browser tooling
- existing E2E tooling
- existing offline storage mechanism
- existing sync mechanism
- current auth implementation
- current case access-control implementation
- current database constraints

Produce:

| Component | Current State | Evidence | Confidence |
|---|---|---|---|
| Backend API | | | |
| Review idempotency | | | |
| Parser safety | | | |
| Parser observability | | | |
| Failure logging | | | |
| Auth | | | |
| Frontend | | | |
| Offline persistence | | | |
| Sync | | | |
| Golden Fixture | | | |
| Documentation | | | |

Do not modify code in this phase unless required to execute an existing command.

---

# 6. PHASE 1 — DOCUMENTATION STATE RECONCILIATION

Inspect:

```text
RetinaGuard_Engineer2_Forensic_Evidence_Register.json
RetinaGuard_Engineer2_Forensic_Engineering_Report.md
task.md
```

Determine whether the files actually contain the claimed updates.

Check:

- existing evidence IDs
- new evidence IDs
- timestamps
- commands
- results
- artifact paths
- limitations
- confidence levels

If documentation is incomplete, update it.

If already correct, do not rewrite unnecessarily.

---

# 7. PHASE 2 — BACKEND RUNTIME VERIFICATION

Perform targeted runtime verification.

## E-010 — Unified API Runtime

Verify:

```text
GET /api/v1/model
POST /api/v1/cases
GET /api/v1/case/:case_uuid
GET /api/v1/queue
POST /api/v1/case/:case_uuid/review
```

Capture:

- request/command
- HTTP status
- response body
- case UUID
- database state
- relevant logs
- timestamp

Expected:

- valid requests succeed
- invalid requests fail safely
- no synthetic clinical output
- no silent corruption

---

# 8. PHASE 3 — MALFORMED JSON RUNTIME VERIFICATION

## E-011

Trigger malformed upstream/model JSON.

Verify:

1. request does not crash the server
2. malformed JSON is not silently treated as valid clinical output
3. `malformed.json.payload` warning is emitted
4. raw payload contents are not logged
5. case remains safe
6. no fabricated DR grade is generated

Capture raw logs.

---

# 9. PHASE 4 — REVIEW IDEMPOTENCY

## E-012 — Sequential Duplicate

Submit the same review twice.

Expected:

```text
First submission  → 200
Duplicate         → 409
```

Verify DB state contains exactly one review.

## E-013 — Concurrent Duplicate

Submit simultaneous duplicate review requests.

Verify:

```text
N requests
      ↓
exactly 1 successful review
      ↓
remaining requests safely rejected
```

Verify the database constraint/transaction is the final protection.

Do not rely only on a pre-check followed by insert.

---

# 10. PHASE 5 — AUTHORIZATION MATRIX

Run actual runtime tests.

| Scenario | Expected |
|---|---:|
| No token | 401 |
| Invalid token | 401 |
| Expired token | 401 |
| Wrong role | 403 |
| Valid technician | 200 where permitted |
| Valid reviewer | 200 where permitted |

Also verify case-level access if implemented.

If case-level authorization is not currently implemented, do not pretend it is.

---

# 11. PHASE 6 — FRONTEND BUILD AND STARTUP

Inspect the actual frontend first.

Determine:

- framework/version
- package manager
- build command
- development command
- existing browser tooling
- existing test framework
- existing E2E tooling

Prefer existing tooling.

If no browser framework exists:

1. determine whether lightweight temporary automation is sufficient
2. avoid permanently adding heavy dependencies unless justified
3. document the justification
4. do not compromise evidence quality merely to avoid tooling

Run:

```text
dependency installation if required
frontend build
frontend startup
startup/health verification
```

Capture commands, exit codes, and artifacts.

---

# 12. PHASE 7 — TECHNICIAN FRONTEND E2E

Verify the actual browser UI.

Required flow:

```text
Open application
      ↓
Technician context
      ↓
Capture screen
      ↓
Patient/case information
      ↓
Fundus image capture/upload
      ↓
Create case
      ↓
POST /api/v1/cases
      ↓
case_uuid
      ↓
Analysis screen
      ↓
Analysis state/result
```

Verify:

- UI renders
- inputs work
- image selection/capture works
- API request occurs
- correct endpoint is used
- response is handled
- case UUID is preserved
- navigation/state transition succeeds

Capture appropriate evidence:

- screenshots
- browser console
- network evidence
- HTTP status
- case UUID
- relevant logs

Do not call service-level tests browser E2E.

---

# 13. PHASE 8 — REVIEWER FRONTEND E2E

Verify:

```text
Reviewer
      ↓
Reviewer Queue
      ↓
Pending Case
      ↓
Open Case
      ↓
Clinical Image
      ↓
AI Analysis
      ↓
Explanation
      ↓
Human Review
      ↓
Submit Review
      ↓
POST /api/v1/case/:case_uuid/review
      ↓
Review Persisted
```

Verify:

- queue loads
- case appears
- case can be opened
- correct image is displayed
- analysis corresponds to current case
- explanation corresponds to current analysis
- reviewer can submit
- review persists
- duplicate submission is safely rejected

Capture browser/network evidence.

---

# 14. PHASE 9 — ACTUAL BROWSER OFFLINE-FIRST E2E

## E-017 — Offline Persistence

This is a critical verification.

Do NOT merely stop the backend.

The browser itself must experience network unavailability.

### Step 1 — Online Baseline

Open application online and verify normal functionality.

### Step 2 — Disable Network

Use browser/network controls to make the application offline.

### Step 3 — Create Offline Case

Perform:

```text
patient/context creation
image capture/upload
case creation
```

Verify local persistence.

Record:

- local case identifier
- storage/outbox state
- image/reference state
- pending sync state

### Step 4 — Reload While Offline

Reload the browser.

Mandatory invariant:

```text
offline case still exists
```

If it disappears:

```text
OFFLINE-FIRST BROWSER PERSISTENCE = NOT VERIFIED
```

---

# 15. PHASE 10 — RECONNECT AND SYNC

## E-018

Restore network connectivity.

Verify:

```text
local case
   ↓
sync engine
   ↓
backend
   ↓
deduplication
   ↓
server state
```

Verify:

- sync starts
- sync succeeds
- case becomes server-visible
- local pending state resolves correctly
- retry behavior is safe
- no duplicate case is created

Capture:

- network request
- response
- DB state
- sync state
- logs

---

# 16. PHASE 11 — REVIEWER VISIBILITY AFTER SYNC

## E-019

After synchronization:

1. open reviewer interface
2. refresh queue
3. verify offline-created case appears
4. open it
5. verify case/image/analysis integrity
6. submit review if appropriate

Confirm:

```text
offline-created case
        ↓
synchronized
        ↓
reviewer-visible
```

---

# 17. PHASE 12 — SYNC DEDUPLICATION

Test:

- duplicate sync request
- retry after timeout
- restart before completion where feasible

Expected:

```text
one logical case
one server case
no duplicated clinical record
```

Record evidence.

---

# 18. PHASE 13 — DIRECT GOLDEN FIXTURE

## E-022

Locate the canonical Golden Fixture.

Determine whether:

```text
tests/integration/e2ePipeline.test.js
```

is actually the canonical fixture or merely an equivalent test.

Execute the canonical fixture directly.

Capture:

- exact command
- timestamp
- stdout
- stderr
- exit code
- generated artifacts

Do not call a proxy test the canonical fixture unless the repository establishes that relationship.

---

# 19. PHASE 14 — FAILURE INJECTION

Run:

### FM-001 — Image Upload Failure

Expected:

- controlled failure
- no fake successful case
- failure log
- safe response

### FM-002 — Malformed Model JSON

Expected:

- no server crash
- warning event
- no fake clinical result

### FM-003 — Duplicate Review

Expected:

```text
409
```

and no duplicate DB record.

### FM-004 — Concurrent Duplicate Review

Expected:

```text
exactly one successful review
```

### FM-005 — Backend Unavailable

Expected:

- no silent data loss
- appropriate local/offline state
- retry/sync behavior where supported

### FM-006 — Sync Retry

Expected:

- retry works
- final state converges
- no duplicate case

---

# 20. PHASE 15 — REGRESSION

Run the authoritative complete backend suite.

Verify:

```text
0 unexplained failures
0 unexplained regressions
```

For skipped tests:

- explain why
- identify impact
- classify release impact

Also verify frontend regression after frontend runtime testing.

---

# 21. PHASE 16 — CLEAN-ROOM REPRODUCTION

Only repeat clean-room if this final pass modifies code/configuration/tooling.

Required:

```text
fresh dependencies
fresh test database
migrations
seed
backend tests
frontend build
frontend startup
required runtime verification
```

Capture exact commands and exit codes.

---

# 22. PHASE 17 — EVIDENCE REGISTER

Update:

```text
RetinaGuard_Engineer2_Forensic_Evidence_Register.json
```

Continue sequentially from the existing IDs.

Suggested mapping:

```text
E-014  Documentation reconciliation
E-015  Frontend build/startup
E-016  Technician browser E2E
E-017  Reviewer browser E2E
E-018  Browser offline persistence
E-019  Browser reconnect/sync
E-020  Reviewer visibility after sync
E-021  Authorization runtime matrix
E-022  Direct Golden Fixture
E-023  Failure injection
E-024  Final regression
E-025  Clean-room reproduction
```

Only create an evidence ID when the verification was actually executed.

Each evidence record must contain:

```json
{
  "evidence_id": "E-XXX",
  "requirement": "",
  "test": "",
  "command_or_action": "",
  "timestamp": "",
  "expected": "",
  "observed": "",
  "result": "",
  "artifact_path": "",
  "confidence": "",
  "limitations": ""
}
```

---

# 23. PHASE 18 — ENGINEERING REPORT

Update:

```text
RetinaGuard_Engineer2_Forensic_Engineering_Report.md
```

The report MUST distinguish:

```text
VERIFIED
PARTIALLY VERIFIED
UNVERIFIED
BLOCKED
```

Do not use:

> production-ready

unless the evidence supports that claim.

Do not claim:

> offline-first verified

unless browser persistence + reload + reconnect + synchronization were directly verified.

Do not claim:

> frontend E2E verified

unless the actual browser UI was executed.

Do not claim:

> Golden Fixture passed

unless the canonical fixture itself was executed or repository evidence establishes that the executed test is the canonical fixture.

---

# 24. CLAIM DISCIPLINE

Every important claim must map to evidence:

```text
Claim
↓
Evidence ID
↓
Raw artifact
↓
Reproducible command/action
↓
Result
```

If evidence does not exist:

```text
Claim = UNVERIFIED
```

---

# 25. CLINICAL SAFETY INVARIANTS

These MUST remain true:

1. Mock MATLAB adapter must NOT generate fake clinical DR grades.
2. Image-quality failure must NOT become a valid DR grade.
3. Human review remains mandatory.
4. No autonomous diagnosis claim.
5. No clinical validation claim without evidence.
6. Do not fabricate sensitivity, specificity, QWK, accuracy, or F1.
7. No patient image/body payload leakage into logs.
8. `case_uuid` remains stable.
9. Duplicate synchronization does not create duplicate cases.
10. Duplicate review does not create duplicate review records.

---

# 26. ARCHITECTURAL INVARIANTS

Preserve:

```text
React Frontend
      ↓
Unified /api/v1
      ↓
Existing Service Architecture
      ↓
Database / Storage
```

Preserve:

- granular services
- compatibility layer
- offline-first architecture
- human-in-loop review
- clinical viewer
- model adapter abstraction
- database architecture

---

# 27. DO NOT PERFORM

Do NOT:

- rebuild compatibility layer
- rewrite backend services
- rewrite React frontend
- introduce unnecessary microservices
- introduce Kubernetes
- introduce blockchain
- introduce vector DB
- introduce LLM infrastructure
- upgrade all npm packages
- change Node versions without justification
- change database architecture
- weaken authentication
- bypass reviewer approval
- fabricate clinical outputs
- mark skipped tests as passed
- convert backend tests into frontend E2E claims
- call integration testing browser E2E
- call backend offline synchronization browser offline-first verification

---

# 28. FINAL RELEASE GATES

## GATE A — Backend

Verify:

- unified API
- runtime behavior
- parser safety
- parser observability
- review idempotency
- concurrent review safety
- failure logging
- model configuration reflection

## GATE B — Security

Verify:

- authentication
- authorization
- role boundaries
- case-level access where implemented

## GATE C — Frontend

Verify:

- frontend build
- technician flow
- reviewer flow
- API integration
- no unexplained browser errors

## GATE D — Offline

Verify:

- browser offline state
- local persistence
- reload survival
- reconnect
- sync
- retry
- deduplication
- reviewer visibility

## GATE E — Evidence

Verify:

- canonical Golden Fixture
- evidence register
- engineering report
- raw artifacts
- timestamps
- reproducible commands

## GATE F — Clean Room

Where applicable:

- fresh dependency installation
- fresh DB
- migrations
- seed
- tests
- frontend build
- startup
- runtime verification

---

# 29. FINAL DISPOSITION

Choose exactly ONE.

## VERIFIED RELEASE CANDIDATE

Only when all critical release gates have direct evidence.

## CONDITIONALLY VERIFIED

Core system is strongly verified but a limited non-critical evidence gap remains.

## PARTIALLY VERIFIED

A major verification domain remains incomplete, such as frontend/browser/offline E2E.

## BLOCKED

Execution cannot continue because of an environment/tooling/repository blocker.

## NOT READY

A critical correctness, safety, security, or integrity requirement fails.

---

# 30. FINAL OUTPUT CONTRACT

Return exactly:

## 1. EXECUTIVE RESULT

One of:

```text
VERIFIED RELEASE CANDIDATE
CONDITIONALLY VERIFIED
PARTIALLY VERIFIED
BLOCKED
NOT READY
```

## 2. WHAT WAS VERIFIED

| Area | Status | Evidence ID | Artifact |
|---|---|---|---|

## 3. WHAT REMAINS UNVERIFIED

For each:

```text
Gap:
Why unverified:
Impact:
Next required action:
```

## 4. TEST EXECUTION SUMMARY

| Test | Exact Command / Action | Expected | Observed | Result | Artifact |
|---|---|---|---|---|---|

## 5. EVIDENCE CREATED

List E-014 onward with one-line descriptions.

## 6. FILES CHANGED

List exact repository paths.

## 7. SECURITY FINDINGS

Only evidence-backed findings.

## 8. OFFLINE-FIRST FINDINGS

Explicitly distinguish:

```text
Backend offline verification
```

from:

```text
Browser offline verification
```

## 9. FRONTEND E2E FINDINGS

Explicitly state whether:

- technician flow was verified
- reviewer flow was verified
- browser network failure was verified
- browser persistence was verified
- reload persistence was verified
- reconnect/sync was verified

## 10. GOLDEN FIXTURE FINDING

State:

```text
DIRECTLY VERIFIED
```

or:

```text
NOT DIRECTLY VERIFIED
```

with explanation.

## 11. REMAINING RISKS

Only evidence-backed risks.

## 12. FINAL ENGINEER-2 DISPOSITION

State one:

```text
FREEZE
CONDITIONAL FREEZE
RETURN FOR ADDITIONAL WORK
BLOCKED
```

Explain using evidence IDs.

---

# 31. FINAL EXECUTION ORDER

Execute exactly in this priority order:

```text
1. Repository reconstruction
        ↓
2. Documentation reconciliation
        ↓
3. Backend runtime verification
        ↓
4. Parser/failure-path verification
        ↓
5. Review concurrency verification
        ↓
6. Authorization verification
        ↓
7. Frontend build/startup
        ↓
8. Technician browser E2E
        ↓
9. Reviewer browser E2E
        ↓
10. Browser offline persistence
        ↓
11. Browser reconnect/sync
        ↓
12. Reviewer visibility after sync
        ↓
13. Sync deduplication/retry
        ↓
14. Direct Golden Fixture
        ↓
15. Failure injection
        ↓
16. Regression
        ↓
17. Clean-room if required
        ↓
18. Evidence Register
        ↓
19. Engineering Report
        ↓
20. Final Release Gate
        ↓
21. Final Disposition
```

---

# 32. FINAL T-800 LOOP

For every finding:

```text
DETECT
  ↓
CLASSIFY
  ↓
REPRODUCE
  ↓
ISOLATE
  ↓
FIX ONLY IF JUSTIFIED
  ↓
TEST
  ↓
FAILURE TEST
  ↓
REGRESSION TEST
  ↓
CAPTURE EVIDENCE
  ↓
UPDATE REGISTER
  ↓
UPDATE REPORT
  ↓
REASSESS RELEASE GATE
```

Never:

```text
DETECT
  ↓
GUESS
  ↓
PATCH RANDOMLY
  ↓
CLAIM FIXED
```

---

# 33. FINAL PRINCIPLE

The final objective is not:

> “Make the checklist green.”

The final objective is:

> **Make every important RetinaGuard Engineer-2 claim reproducible, evidence-backed, clinically safe, and technically truthful.**

If evidence is incomplete, say so.

If frontend E2E cannot be verified, say so.

If browser offline persistence cannot be verified, say so.

If the Golden Fixture cannot be directly established, say so.

If everything is genuinely verified, freeze the implementation.

**Evidence decides the release status.**
