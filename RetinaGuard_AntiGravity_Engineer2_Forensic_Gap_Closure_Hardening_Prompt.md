# RetinaGuard — Anti-Gravity Forensic Gap Closure & Production Hardening Prompt
## BMPv2 + PROTOCOL T-800 LOOP
### Engineer 2 · Post-Forensic Audit Remediation · Runtime Verification · Release Closure
### SIH 2026 · Problem Statement 26038 · Path B

---

# 0. MISSION

You are operating inside the existing **RetinaGuard** repository as a senior autonomous engineering agent.

Your job is NOT to rebuild RetinaGuard.

Your job is to take the existing Engineer-2 implementation and the completed forensic audit, then:

```text
FORENSIC FINDINGS
      ↓
EVIDENCE GAP CLOSURE
      ↓
TARGETED HARDENING
      ↓
RUNTIME VERIFICATION
      ↓
FAILURE INJECTION
      ↓
E2E VERIFICATION
      ↓
CLEAN-ROOM REPRODUCTION
      ↓
EVIDENCE UPDATE
      ↓
FINAL FORENSIC REPORT
      ↓
RELEASE FREEZE
```

The objective is to convert the current state from:

> "The implementation appears correct and is supported by static/code evidence"

into:

> "The implementation is hardened and independently demonstrated through reproducible runtime evidence."

Do not optimize for code volume.

Do not perform unnecessary dependency upgrades.

Do not rewrite working architecture.

Do not fabricate test results.

Do not mark anything PASS without executing or directly proving it.

---

# 1. AUTHORITATIVE SOURCE MATERIALS

Before touching code, inspect and correlate:

1. BMPv2 prompt-engineering material.
2. PROTOCOL T-800 LOOP.
3. RetinaGuard SIH Problem Statement / engineering blueprint.
4. Engineer-2 Day-1 execution context.
5. Engineer-2 Day-2 execution prompt.
6. `RetinaGuard_Engineer2_Forensic_Evidence_Register.json`
7. `RetinaGuard_Engineer2_Forensic_Engineering_Report.md`
8. Current repository implementation.
9. Existing tests, configuration, database schema, frontend, synchronization code, MATLAB adapter, deployment artifacts.

Treat:

```text
CURRENT REPOSITORY
+
RUNTIME OBSERVATION
+
EXECUTED TEST OUTPUT
```

as the highest-authority evidence for actual implementation state.

Treat previous delivery reports as CLAIMS, not proof.

Treat the forensic report as the current audit baseline, but independently verify its conclusions.

When evidence conflicts:

1. Preserve the contradiction.
2. Investigate the root cause.
3. Do not silently choose whichever source is convenient.
4. Record the discrepancy.
5. Resolve it with direct evidence where possible.

---

# 2. CURRENT VERIFIED BASELINE

The previous forensic audit established substantial implementation evidence.

Known evidence includes:

- Unified `v1` compatibility routes exist.
- `cases.controller.js` implements case creation, aggregation, review, queue, and model orchestration.
- `parseJSONSafe` exists.
- Review duplication detection exists and can return `409`.
- Global error normalization exists.
- Structured lifecycle logging exists.
- `/model` reflects runtime configuration.
- Frontend `casesService` maps to the unified API.
- Mock MATLAB behavior intentionally avoids fabricating unsupported clinical grades.
- `npm test` previously passed 15 suites / 81 tests with 2 explicitly skipped mock-adapter constraint tests.

Do NOT recreate these features merely because they already exist.

Instead:

```text
VERIFY
HARDEN
TEST
PROVE
DOCUMENT
```

---

# 3. CURRENT FORENSIC GAPS — MANDATORY CLOSURE

The previous audit identified evidence limitations.

These are now P0/P1 closure targets.

## GAP-001 — Frontend runtime E2E

Previous state:

- frontend integration was primarily statically traced;
- dynamic browser execution was not fully established.

Required closure:

```text
Technician
→ capture
→ case creation
→ image upload
→ analysis state
→ unified case hydration
→ clinical viewer
→ reviewer queue
→ human review
→ queue update
```

Must be executed in a real browser/runtime environment.

---

## GAP-002 — Offline/reconnect runtime verification

Previous state:

- sync/outbox architecture was inspected;
- complete browser offline → reconnect → sync behavior was not independently demonstrated with full runtime evidence.

Required closure:

```text
network ON
→ create case
→ network OFF
→ persist locally
→ reload/restart if applicable
→ network ON
→ automatic sync
→ server persistence
→ reviewer visibility
```

Must prove:

- no local data loss;
- no duplicate case;
- same `case_uuid` survives synchronization;
- failed sync remains retryable;
- reconnect resumes synchronization;
- restart does not destroy pending work.

---

## GAP-003 — Golden Fixture direct execution

Previous state:

- `npm test` was used as a proxy;
- exact raw Golden Fixture execution evidence was not captured.

Required closure:

Create or identify a direct executable Golden Fixture command.

Prefer:

```bash
npm run test:golden
```

if consistent with repository conventions.

The direct fixture must produce:

- deterministic input;
- actual output;
- expected output;
- pass/fail status;
- relevant database assertions;
- exit code;
- reproducible logs.

Do not call a generic test-suite pass "direct Golden Fixture proof" unless the fixture itself was actually executed and identified.

---

## GAP-004 — Review idempotency race safety

Existing implementation checks whether a review already exists and returns `409`.

Do NOT assume this is race-safe.

Investigate:

```text
Request A → duplicate check
Request B → duplicate check
Request A → insert
Request B → insert
```

Required property:

```text
AT MOST ONE VALID REVIEW
```

Implement database/service-level atomicity where necessary.

Preferred protection:

```text
application duplicate check
+
database uniqueness constraint
+
atomic transaction/insert
+
normalized 409 response
```

Do not introduce unnecessary infrastructure.

---

## GAP-005 — Runtime authorization verification

Static middleware inspection is insufficient.

Execute an authorization matrix:

```text
no token                  → 401
invalid token             → 401
expired token             → 401
technician allowed action → success
technician reviewer-only  → 403
reviewer allowed action   → success
unauthorized case access  → denied
```

Do not weaken role boundaries to make tests pass.

---

## GAP-006 — `parseJSONSafe` observability

Current behavior safely prevents malformed JSON from crashing aggregation.

However:

```text
containment
≠
observability
```

Investigate whether malformed metadata becomes silently invisible.

Required behavior:

```text
malformed JSON
    ↓
safe fallback
    +
structured diagnostic event
    +
case/analysis correlation
    +
appropriate metric or observable signal
```

Do not expose sensitive payloads in logs.

Do not log raw PHI or image data.

---

# 4. SECONDARY HARDENING TARGETS

## HARDEN-001 — Failure-path audit logging

Verify or implement structured events for meaningful failure conditions:

```text
case.creation.failed
image.upload.failed
review.duplicate
review.failed
unauthorized.access
sync.failed
sync.retry
sync.completed
```

Use existing logging infrastructure.

Do not introduce a second logging framework.

---

## HARDEN-002 — Case-level access control

Verify that authorization is not merely role-based.

Where repository architecture supports it, ensure a user cannot retrieve another unauthorized case by guessing its UUID.

Test:

```text
User A
→ Case A
→ allowed

User A
→ Case B
→ denied
```

Preserve the existing authorization model unless evidence shows it is insufficient.

---

## HARDEN-003 — Sync state integrity

Inspect existing `syncService.js` and `syncQueueRepository.js`.

Do not rewrite them blindly.

Determine whether current implementation safely handles:

```text
PENDING
IN_FLIGHT
SYNCED
RETRY
FAILED
```

or an equivalent state model.

Ensure pending work survives:

- network failure;
- process restart;
- browser restart where applicable;
- server rejection.

If equivalent mechanisms already exist, preserve them and improve tests/documentation rather than duplicating architecture.

---

## HARDEN-004 — Sync idempotency

Prove that retrying the same synchronization operation does not create duplicate server-side entities.

Test:

```text
sync
→ timeout
→ retry
→ exactly one server record
```

Use existing identifiers/idempotency mechanisms.

---

## HARDEN-005 — Model configuration reflection

Runtime-test:

```text
MODEL_VERSION=A
→ GET /api/v1/model
→ A

MODEL_VERSION=B
→ GET /api/v1/model
→ B
```

and:

```text
MATLAB_ADAPTER=mock
→ GET /api/v1/model
→ mock
```

Do not hardcode expected values into production code merely to satisfy tests.

---

# 5. PROTOCOL T-800 LOOP — MANDATORY OPERATING METHOD

Follow this loop:

```text
INPUT INTELLIGENCE
      ↓
PROBLEM CLASSIFICATION
      ↓
INFORMATION GAP DETECTION
      ↓
EVIDENCE REGISTER
      ↓
FORENSIC INVESTIGATION
      ↓
ROOT CAUSE
      ↓
SUCCESS CRITERIA
      ↓
REMEDIATION PLAN
      ↓
PRECISION EXECUTION
      ↓
CONTINUOUS VERIFICATION
      ↓
FAILURE RECOVERY
      ↓
DEEP VALIDATION
      ↓
EVIDENCE UPDATE
      ↓
FINAL VERIFICATION
```

If validation fails:

```text
STOP
↓
IDENTIFY EXACT FAILURE
↓
ROOT CAUSE
↓
PATCH
↓
RETEST
↓
UPDATE EVIDENCE
```

Never simply rerun a failed test and call the second attempt proof without explaining the failure.

---

# 6. PHASE 0 — REPOSITORY FORENSIC RECONSTRUCTION

Before changing anything:

Inspect:

```text
git status
git diff
git log --oneline
package.json
package-lock.json / equivalent
.env.example
config
routes
controllers
services
repositories
database schema/migrations
frontend services
frontend pages
frontend routes
sync code
audit code
MATLAB adapter
tests
E2E configuration
deployment files
Golden Fixture files
```

Determine:

```text
what changed since previous audit
what remains unchanged
what claims are still unsupported
what tests already exist
what tests are missing
```

Produce internally:

| Gap ID | Claim | Current Evidence | Missing Evidence | Code Change Required? | Test Required? |
|---|---|---|---|---|---|

Do not code before this matrix exists.

---

# 7. PHASE 1 — P0 HARDENING

Implement only justified changes.

## 7.1 Race-safe review idempotency

Acceptance:

```text
sequential duplicate → 409
concurrent duplicate → one success, one conflict
database → exactly one review
retry → no duplicate
```

Also ensure the reviewer service remains the business-logic authority.

Do not bypass `reviewerService`.

---

## 7.2 Parser corruption observability

Acceptance:

```text
valid JSON → normal response

malformed JSON
→ endpoint remains stable
→ safe fallback
→ diagnostic event exists
→ no sensitive payload leakage
```

---

## 7.3 Failure-path observability

Acceptance:

Each meaningful failure produces a traceable event with:

```text
event name
timestamp
case_uuid where applicable
request correlation where available
actor/context where safe
error classification
```

---

# 8. PHASE 2 — BACKEND RUNTIME VERIFICATION

Start backend from a clean runtime.

Verify:

```text
health
model
create case
get case
queue
review
error paths
```

For each endpoint capture:

```text
REQUEST
RESPONSE
HTTP STATUS
DATABASE EFFECT
LOG EFFECT
```

No "verified" label without actual execution evidence.

---

# 9. PHASE 3 — SECURITY VERIFICATION

Execute:

```text
unauthenticated
invalid token
expired token
wrong role
correct role
cross-case access
```

Acceptance:

```text
401 / 403 boundaries are deterministic
no unauthorized case data returned
no image/report/explanation leakage
```

Do not weaken authentication simply to enable offline workflows.

---

# 10. PHASE 4 — FRONTEND BROWSER E2E

Use the repository's existing browser testing approach if available.

If no suitable browser E2E framework exists and adding one is justified, prefer a minimal Playwright-based verification layer rather than introducing a heavy framework.

Test:

### Technician

```text
login
→ /capture
→ patient/session creation
→ image capture/upload
→ analysis state
→ case hydration
→ result viewer
```

### Reviewer

```text
/reviewer
→ queue
→ open case
→ inspect result
→ submit decision
→ queue state updates
```

Capture:

```text
browser console
network requests
HTTP responses
screenshots on failure
backend logs
database state
```

---

# 11. PHASE 5 — OFFLINE-FIRST E2E

Execute real browser offline mode.

Test:

```text
1. Login while online.
2. Load application.
3. Disable network.
4. Create/capture case.
5. Verify local persistence.
6. Reload application if architecture supports it.
7. Verify pending state remains.
8. Restore network.
9. Wait for sync.
10. Verify server persistence.
11. Verify reviewer queue.
12. Verify no duplicate case.
```

Then test:

```text
offline
→ sync attempt
→ network failure
→ retry
→ success
```

Then:

```text
offline
→ application/process restart
→ reconnect
→ sync
```

Acceptance:

```text
NO DATA LOSS
NO DUPLICATE CASE
NO DUPLICATE REVIEW
SAME CASE UUID
SYNC EVENT TRACEABLE
```

---

# 12. PHASE 6 — DIRECT GOLDEN FIXTURE

Identify the canonical Golden Fixture.

If missing:

1. Search repository.
2. Search test manifests.
3. Search documentation.
4. Determine the existing equivalent.
5. Do NOT invent a fake fixture and call it canonical.
6. If no canonical fixture exists, document that gap explicitly and create the smallest deterministic fixture only if consistent with the documented contract.

Run directly.

Capture:

```text
fixture ID
input
environment
expected output
actual output
database assertions
logs
exit code
runtime
```

The fixture must be reproducible.

---

# 13. PHASE 7 — CLEAN-ROOM REPRODUCTION

Perform a genuine clean verification.

Remove reliance on:

```text
old node_modules
old DB
old generated files
browser state
cached artifacts
local uploads
stale build output
```

Then:

```text
install
→ configure
→ initialize
→ build
→ test
→ Golden Fixture
→ backend runtime
→ frontend runtime
→ E2E
```

Record exact commands.

If clean-room reproduction fails:

```text
DO NOT HIDE THE FAILURE.
```

Determine whether the problem is:

```text
documentation
environment
dependency
configuration
migration
build
runtime
test
```

and fix the root cause where appropriate.

---

# 14. PHASE 8 — REGRESSION VERIFICATION

After every P0/P1 modification:

Run:

```text
unit tests
integration tests
Golden Fixture
backend build
frontend build
frontend E2E
offline E2E
security tests
```

Verify that:

```text
existing granular services remain intact
existing frontend behavior remains compatible
mock safety constraint remains intact
human review remains mandatory
quality failure cannot become a DR grade
```

---

# 15. DO NOT PERFORM THESE CHANGES WITHOUT EVIDENCE

Do NOT:

```text
upgrade all npm packages
replace Express
replace SQLite
replace PostgreSQL
replace React
replace existing state management
rewrite compatibility layer
convert architecture into microservices
add Kubernetes
add blockchain
add LLM functionality
add vector database
replace MATLAB adapter
remove mock safety constraints
invent clinical inference
invent accuracy claims
```

A dependency upgrade is justified only if:

```text
current version causes a demonstrated defect
OR
security vulnerability directly affects the system
OR
required runtime capability cannot be achieved otherwise
```

If upgrading:

```text
identify package
identify reason
identify version
identify breaking changes
run regression suite
record before/after
```

---

# 16. CLINICAL SAFETY INVARIANTS

These must never regress:

```text
quality failure
    ≠
valid DR grade

mock adapter
    ≠
clinical evidence

AI output
    ≠
autonomous diagnosis

human review
    remains explicit

uncertainty
    remains visible

unsupported model result
    must not be fabricated
```

Do not claim:

```text
clinical validation
regulatory approval
production clinical deployment
diagnostic equivalence
measured sensitivity/specificity
```

unless direct evidence exists.

---

# 17. EVIDENCE ENGINE

Update the existing evidence register.

Use stable IDs.

Continue from the existing IDs rather than resetting them.

Recommended evidence additions:

```text
E-010 Backend live endpoint suite
E-011 malformed JSON runtime test
E-012 sequential review idempotency
E-013 concurrent review idempotency
E-014 frontend technician E2E
E-015 frontend reviewer E2E
E-016 browser offline persistence
E-017 reconnect synchronization
E-018 sync deduplication
E-019 authorization matrix
E-020 cross-case access control
E-021 failure-path logging
E-022 direct Golden Fixture execution
E-023 clean-room rebuild
E-024 clean-room E2E
E-025 runtime model configuration reflection
E-026 sync restart recovery
```

Do not create an evidence ID unless the evidence actually exists.

Each evidence item must contain:

```json
{
  "id": "E-XXX",
  "type": "test|runtime|code|config|log|database|browser|artifact",
  "source": "...",
  "location": "...",
  "command": "...",
  "observation": "...",
  "expected": "...",
  "actual": "...",
  "supports": [],
  "confidence": "...",
  "timestamp": "...",
  "reproducibility": "..."
}
```

---

# 18. FINDING CLASSIFICATION

Use these categories precisely:

```text
VERIFIED FACT
OBSERVED BEHAVIOR
SATISFIED REQUIREMENT
PARTIALLY SATISFIED
UNSATISFIED
UNVERIFIED CLAIM
MISSING EVIDENCE
POTENTIAL ISSUE
CONFIRMED ISSUE
INTENTIONAL DEFERMENT
ASSUMPTION
SUPPORTED INFERENCE
UNSUPPORTED INFERENCE
```

Do not turn:

```text
"not tested"
```

into:

```text
"broken"
```

Likewise, do not turn:

```text
"code exists"
```

into:

```text
"runtime verified"
```

---

# 19. FAILURE MODE ANALYSIS

Create or update failure modes:

```text
FM-001 Frontend runtime integration failure
FM-002 Offline persistence failure
FM-003 Reconnect synchronization failure
FM-004 Sync duplication
FM-005 Review race duplication
FM-006 Authorization bypass
FM-007 Cross-case data exposure
FM-008 Silent malformed metadata
FM-009 Golden Fixture divergence
FM-010 Clean-room reproducibility failure
FM-011 Model configuration mismatch
FM-012 Failure-path observability loss
```

For each:

```text
Trigger
Root Cause
Detection
Impact
Likelihood
Severity
Current Mitigation
Evidence
Residual Risk
Corrective Action
Verification Status
```

Do not invent likelihood numbers unless measured or explicitly documented.

---

# 20. FINAL RELEASE GATES

Do not declare final release readiness until every gate has a direct evidence status.

## Gate A — Backend

```text
[ ] all unified endpoints runtime tested
[ ] error contract verified
[ ] malformed JSON containment verified
[ ] review idempotency race tested
[ ] model reflection tested
```

## Gate B — Frontend

```text
[ ] technician E2E
[ ] reviewer E2E
[ ] case hydration
[ ] review submission
```

## Gate C — Offline

```text
[ ] offline persistence
[ ] reload recovery
[ ] reconnect sync
[ ] retry
[ ] restart recovery
[ ] deduplication
```

## Gate D — Security

```text
[ ] unauthenticated
[ ] invalid token
[ ] expired token
[ ] wrong role
[ ] correct role
[ ] cross-case isolation
```

## Gate E — Golden Fixture

```text
[ ] direct execution
[ ] deterministic output
[ ] raw evidence captured
[ ] DB assertions
```

## Gate F — Clean Room

```text
[ ] fresh environment
[ ] clean install
[ ] DB initialization
[ ] build
[ ] tests
[ ] Golden Fixture
[ ] E2E
```

## Gate G — Regression

```text
[ ] npm test
[ ] backend build
[ ] frontend build
[ ] safety invariants
[ ] granular services preserved
```

---

# 21. FINAL DISPOSITION RULE

Use ONLY one of:

```text
VERIFIED
CONDITIONALLY VERIFIED
PARTIALLY VERIFIED
BLOCKED
NOT READY
```

Rules:

### VERIFIED

Only if all critical runtime evidence exists.

### CONDITIONALLY VERIFIED

Use when implementation is strong but one or more non-critical evidence gaps remain.

### PARTIALLY VERIFIED

Use when meaningful functionality works but critical verification is incomplete.

### BLOCKED

Use when a critical dependency prevents meaningful validation.

### NOT READY

Use when critical functionality itself is broken.

Never use "VERIFIED" because:

```text
tests passed
```

alone.

---

# 22. FINAL FORENSIC REPORT UPDATE

Regenerate:

```text
RetinaGuard_Engineer2_Forensic_Evidence_Register.json
RetinaGuard_Engineer2_Forensic_Engineering_Report.md
```

The final report MUST include:

1. Executive Summary
2. Audit Scope
3. Source Hierarchy
4. Repository Reconstruction
5. Change Inventory
6. Requirement Traceability Matrix
7. Runtime Verification Matrix
8. Frontend E2E Results
9. Offline/Sync Results
10. Security Results
11. Golden Fixture Results
12. Clean-Room Results
13. Failure Mode Register
14. Assumption Register
15. Evidence Register
16. Confirmed Issues
17. Remaining Evidence Gaps
18. Corrective Actions
19. Regression Assessment
20. Clinical Safety Assessment
21. Release Gates
22. Final Disposition
23. Exact Reproduction Commands
24. Known Limitations

---

# 23. MANDATORY CLAIM DISCIPLINE

For every important statement, ask:

```text
WHAT IS THE EVIDENCE?
```

Then classify:

```text
CODE EVIDENCE
RUNTIME EVIDENCE
TEST EVIDENCE
DATABASE EVIDENCE
BROWSER EVIDENCE
CONFIGURATION EVIDENCE
DOCUMENTATION CLAIM
INFERENCE
UNKNOWN
```

Never write:

> "fully verified"

when the underlying evidence says:

> "statically inspected."

Never write:

> "offline E2E passes"

unless offline E2E actually executed.

Never write:

> "Golden Fixture passes"

unless the canonical fixture actually ran.

Never write:

> "production ready"

unless the release gates support that conclusion.

---

# 24. FINAL OUTPUT CONTRACT

At the end of execution, return:

## A. Execution Summary

```text
Changes made:
Tests added:
Tests modified:
Tests executed:
Runtime scenarios executed:
Security scenarios executed:
Offline scenarios executed:
Golden Fixture status:
Clean-room status:
```

## B. Evidence Summary

```text
Previous evidence count:
New evidence count:
Verified claims:
Unverified claims:
Confirmed issues:
Remaining gaps:
```

## C. Code Changes

For every change:

```text
FILE
CHANGE
REASON
RISK
VALIDATION
```

## D. Final Status

```text
VERIFIED
CONDITIONALLY VERIFIED
PARTIALLY VERIFIED
BLOCKED
NOT READY
```

## E. Remaining Work

Only list work supported by evidence.

---

# 25. ANTI-HALLUCINATION RULES

Absolute rules:

```text
DO NOT INVENT FILES
DO NOT INVENT TEST RESULTS
DO NOT INVENT RUNTIME OUTPUT
DO NOT INVENT CLINICAL RESULTS
DO NOT INVENT PERFORMANCE NUMBERS
DO NOT INVENT SECURITY PROOF
DO NOT INVENT GOLDEN FIXTURE OUTPUT
DO NOT INVENT OFFLINE SUCCESS
DO NOT INVENT DEPENDENCY UPGRADES
DO NOT HIDE FAILURES
DO NOT DELETE EVIDENCE OF FAILURE
DO NOT TURN ASSUMPTIONS INTO FACTS
```

If a command cannot run:

```text
record it as unavailable
explain why
do not fabricate its output
```

If a requirement cannot be proven:

```text
mark it UNVERIFIED
```

If code appears correct but runtime evidence is absent:

```text
mark STATICALLY VERIFIED
not RUNTIME VERIFIED
```

---

# 26. FINAL COMMAND

Begin immediately.

Your execution order is:

```text
1. READ ALL AUTHORITATIVE MATERIAL
2. INSPECT CURRENT REPOSITORY
3. RECONCILE PREVIOUS FORENSIC FINDINGS
4. BUILD GAP MATRIX
5. FIX P0 HARDENING ISSUES
6. ADD ONLY NECESSARY TESTS
7. RUN BACKEND RUNTIME VERIFICATION
8. RUN SECURITY VERIFICATION
9. RUN FRONTEND E2E
10. RUN OFFLINE/RECONNECT E2E
11. RUN CONCURRENCY / IDEMPOTENCY TESTS
12. RUN DIRECT GOLDEN FIXTURE
13. PERFORM CLEAN-ROOM REBUILD
14. RUN FULL REGRESSION
15. UPDATE EVIDENCE REGISTER
16. UPDATE FORENSIC REPORT
17. RECHECK EVERY CLAIM
18. ASSIGN FINAL DISPOSITION
19. FREEZE RELEASE CANDIDATE
```

Do not stop after writing tests.

Do not stop after fixing code.

Do not stop after `npm test`.

Continue until the **implementation and the evidence supporting the implementation are both strong enough for independent senior-engineer review**.

The final objective is not:

> "The code looks good."

The final objective is:

> **"The system has been changed only where justified, every critical behavior has been independently verified, every remaining limitation is explicitly documented, and every release claim is traceable to reproducible evidence."**
