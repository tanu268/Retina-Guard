# RetinaGuard — Anti-Gravity Day 2 Execution Prompt
## Engineer 2 — Compatibility Layer → Production Hardening → Integration → Verification → Release Candidate
### SIH 2026 · Problem Statement 26038 · Path B

---

# 0. EXECUTION MODE

You are **Engineer 2** working inside the existing RetinaGuard repository.

This is **Day 2**.

Do NOT treat the project as a blank slate.

Day 1 has already produced and verified a significant compatibility-layer implementation. Your job now is to:

```text
VERIFY WHAT EXISTS
        ↓
PRESERVE WORKING ARCHITECTURE
        ↓
COMPLETE THE REMAINING SYSTEM
        ↓
HARDEN IT
        ↓
INTEGRATE IT
        ↓
TEST IT
        ↓
PACKAGE IT
        ↓
PROVE IT FROM A CLEAN START
```

The goal is not to write the largest amount of code.

The goal is to leave the repository with a **deterministic, safe, testable, offline-first, unified-v1 RetinaGuard application that can survive the Golden Fixture path and the final SIH demonstration.**

---

# 1. AUTHORITATIVE CURRENT STATE

The following is the **actual Day-1 baseline** and MUST be treated as the starting point.

Do not recreate these components unless verification proves they are broken.

## 1.1 Existing Backend Architecture

The backend already has a granular service-oriented architecture containing:

```text
Consultation Service
Image Service
Analysis Service
Reviewer Service
```

A new compatibility layer has already been added so the existing architecture can satisfy the unified Master Prompt `v1` contract.

The compatibility layer exists at:

```text
src/modules/cases/cases.routes.js
src/modules/cases/cases.controller.js
```

This compatibility layer is the **Day-2 foundation**.

Do NOT replace the granular services with a monolithic `CasesService`.

Do NOT tear down the existing service architecture.

The compatibility layer should continue acting as an orchestration/translation boundary over the existing services.

---

# 2. DAY-1 COMPATIBILITY LAYER — ALREADY IMPLEMENTED

The following unified API contract already exists.

## 2.1 Create Case

```http
POST /api/v1/cases
```

Current behavior:

```text
Create consultation session
        ↓
Attach patient/device ID
        ↓
Upload fundus image using imageService
        ↓
Trigger quality gate
        ↓
Return unified response
```

Expected response contract:

```json
{
  "case_uuid": "...",
  "status": "..."
}
```

The Day-2 engineer must **verify this contract**, not redesign it.

---

## 2.2 Get Unified Case

```http
GET /api/v1/case/:case_uuid
```

This endpoint aggregates:

```text
Consultation state
+
Image assessment
+
Inference analysis
+
Explainability
+
Report
+
Review state
```

The endpoint is the primary unified case hydration mechanism for the frontend and Golden Fixture path.

Day 2 must harden this aggregation.

---

## 2.3 Submit Review

```http
POST /api/v1/case/:case_uuid/review
```

Current implementation delegates adjudication to:

```text
reviewerService
```

Day 2 must verify:

```text
validation
authorization
idempotency
auditability
error handling
```

without bypassing `reviewerService`.

---

## 2.4 Reviewer Queue

```http
GET /api/v1/queue
```

This exposes cases pending human review.

Day 2 must make this endpoint deterministic, safe, and compatible with the existing reviewer UI.

---

## 2.5 Model Endpoint

```http
GET /api/v1/model
```

Current behavior returns:

```text
inference adapter health
+
active model version
```

Current model configuration:

```env
MATLAB_ADAPTER=mock
MODEL_VERSION=retinaguard_resnet18.onnx
```

This is intentional for deterministic evaluation.

Do NOT silently replace the mock adapter with real MATLAB execution.

Do NOT modify the model.

Do NOT claim that the mock adapter is real clinical inference.

---

# 3. DAY-1 FRONTEND COMPATIBILITY — ALREADY IMPLEMENTED

The frontend already depends on specialized service response shapes.

Do NOT rewrite the frontend architecture simply to make it look cleaner.

The following compatibility behavior already exists.

---

## 3.1 ImageCapture

`ImageCapture.tsx` uses:

```text
casesService.createCase
```

The case is initialized using the:

```text
patient_id
```

from the newly created Consultation.

Preserve this behavior unless an actual defect is found.

---

## 3.2 AiAnalysis

`AiAnalysis.tsx` continues using:

```text
analysisService.run()
```

The UI is then hydrated using:

```text
casesService.getCase()
```

through polling of:

```http
GET /api/v1/case/:case_uuid
```

This preserves the existing rich clinical viewer.

Do not replace this with a new frontend inference architecture.

---

## 3.3 ReviewWorkspace

The existing frontend reviewer workflow has been preserved.

The `reviewService` methods in `api.ts` now route internally through:

```http
GET /api/v1/queue
POST /api/v1/case/:case_uuid/review
```

The human-in-the-loop workflow therefore remains intact while consuming the unified API contract.

Preserve this.

---

# 4. DAY-1 VERIFIED RUNTIME STATE

The backend was successfully started using:

```bash
npm start
```

Inside:

```text
retinaguard-backend
```

Verified baseline:

```text
Express server
        ↓
/api/v1 mounted
        ↓
SQLite instantiated
        ↓
MATLAB adapter available
        ↓
MATLAB_ADAPTER=mock
        ↓
MODEL_VERSION=retinaguard_resnet18.onnx
```

Day 2 must independently re-run these checks.

Do not assume a previous successful startup means the current branch is healthy.

---

# 5. DAY-1 ARCHITECTURAL PRINCIPLE

The compatibility layer is a **translation/orchestration layer**, not a replacement architecture.

Maintain:

```text
                     Unified v1 API
                           │
                           ▼
                ┌────────────────────┐
                │ Cases Compatibility│
                │      Layer         │
                └─────────┬──────────┘
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
 Consultation        Image Service    Analysis Service
 Service                  │                │
                          │                │
                          └──────┬─────────┘
                                 ▼
                         Reviewer Service
```

The exact internal architecture may differ where the repository already has working abstractions.

The key requirement is:

```text
Unified external contract
+
Existing internal services
+
No breaking frontend change
```

---

# 6. DAY-2 MISSION

Your Day-2 mission is:

> **Complete and productionize the existing compatibility-layer implementation without destroying the existing service architecture or frontend flow.**

Specifically:

```text
Compatibility Layer
        ↓
Contract Hardening
        ↓
Case Lifecycle Integrity
        ↓
Review Workflow
        ↓
Authentication / Authorization
        ↓
Offline-First Reliability
        ↓
Sync / Reconciliation
        ↓
Reports / Explainability
        ↓
Observability
        ↓
Security
        ↓
Performance
        ↓
Failure Testing
        ↓
Clean-Room Verification
        ↓
Deployment Packaging
        ↓
Golden E2E
        ↓
Release Candidate
```

---

# 7. ABSOLUTE RULES

## 7.1 Do NOT rebuild

Never:

```text
rewrite backend
replace service architecture
replace frontend architecture
duplicate existing services
move all business logic into cases.controller.js
replace SQLite unnecessarily
introduce microservices
introduce Kafka
introduce Redis without requirement
introduce Kubernetes
introduce blockchain
introduce LLMs
introduce vector DB
```

---

## 7.2 Do NOT modify ML semantics

Engineer 2 must NOT:

```text
retrain
change model weights
change class definitions
change preprocessing
change deployment threshold
change calibration
invent metrics
invent clinical claims
```

The active evaluation configuration remains:

```env
MATLAB_ADAPTER=mock
MODEL_VERSION=retinaguard_resnet18.onnx
```

unless an explicit higher-level task changes it.

---

## 7.3 Mock mode must remain explicit

Mock inference is acceptable for the deterministic evaluation path.

But the application must never disguise it as real model inference.

The system should be able to make the distinction clear:

```text
Inference provider:
MOCK / MATLAB / OTHER
```

where supported.

Never write:

```text
Clinically validated
```

or:

```text
Real diagnostic inference
```

based on mock output.

---

# 8. ENGINEERING PRINCIPLES

Use:

```text
Existing architecture
        ↓
Smallest safe change
        ↓
Explicit contract
        ↓
Test
        ↓
Integrate
        ↓
Measure
```

Every meaningful change must have:

```text
WHY
WHAT
CONTRACT
FAILURE MODE
TEST
EVIDENCE
```

---

# 9. PHASE 0 — FORENSIC DAY-1 AUDIT

Before writing code, inspect the actual repository.

Run:

```bash
git status
git log --oneline --decorate -n 20
find . -maxdepth 3 -type f | sort
```

Use equivalent commands if the repository structure requires them.

Inspect:

```text
retinaguard-backend
retinaguard-frontend
package.json
.env
.env.example
database
migrations
routes
controllers
services
repositories
modules
frontend services
frontend pages
API clients
tests
fixtures
reports
sync implementation
audit implementation
MATLAB adapter
deployment files
README
```

Then run the application.

Verify:

```bash
npm start
```

and the frontend using the existing documented command.

---

# 10. BUILD THE DAY-2 GAP MATRIX

Create a working matrix:

| Area | Current State | Evidence | Risk | Action |
|---|---|---|---|---|
| POST /cases | | | | |
| GET /case | | | | |
| POST /review | | | | |
| GET /queue | | | | |
| GET /model | | | | |
| Consultation | | | | |
| Image service | | | | |
| Analysis | | | | |
| Reviewer | | | | |
| Frontend integration | | | | |
| Offline persistence | | | | |
| Sync | | | | |
| Reports | | | | |
| Explainability | | | | |
| Auth | | | | |
| RBAC | | | | |
| Audit | | | | |
| Security | | | | |
| Observability | | | | |
| Testing | | | | |
| Deployment | | | | |

Classify each item:

```text
VERIFIED
PARTIAL
BROKEN
MOCKED
MISSING
BLOCKED
```

Do not use:

```text
"probably works"
"looks fine"
"should work"
```

without evidence.

---

# 11. PHASE 1 — UNIFIED API CONTRACT HARDENING

The compatibility layer is the most important Day-1 deliverable.

Harden it without changing its public contract.

---

## 11.1 POST /api/v1/cases

Verify the complete lifecycle:

```text
request validation
        ↓
consultation creation
        ↓
patient/device attachment
        ↓
image upload
        ↓
quality gate
        ↓
case UUID
        ↓
unified response
```

Required:

```json
{
  "case_uuid": "...",
  "status": "..."
}
```

Verify:

- missing patient/device ID,
- missing image,
- malformed image,
- unsupported file type,
- oversized file,
- invalid request body,
- duplicate submission,
- service failure,
- quality rejection.

### Critical invariant

If image processing or quality evaluation fails:

```text
DO NOT fabricate a DR grade.
```

The case should remain recoverable.

---

# 12. PHASE 2 — GET /api/v1/case/:case_uuid

This endpoint is the central aggregator.

It must safely combine:

```text
Consultation
Image
Analysis
Explanation
Report
Review
```

Verify:

```text
case exists
case does not exist
partial case
quality rejected case
analysis pending
analysis failed
report unavailable
review pending
review complete
```

The endpoint must not crash because one optional downstream component is unavailable.

Use explicit state semantics.

For example:

```json
{
  "case_uuid": "...",
  "status": "...",
  "analysis": {
    "status": "PENDING"
  },
  "review": {
    "status": "PENDING"
  }
}
```

Do not replace missing state with fake data.

---

# 13. PHASE 3 — POST /api/v1/case/:case_uuid/review

Continue delegating to:

```text
reviewerService
```

Do not duplicate reviewer business logic in the compatibility controller.

Verify:

```text
case validation
reviewer validation
decision validation
authorization
duplicate decision handling
audit event
state transition
```

Review must be:

```text
explicit
auditable
idempotent where contract requires
```

Never overwrite the historical AI result.

The conceptual state must remain:

```text
AI RESULT
+
HUMAN REVIEW
```

not:

```text
AI RESULT replaced by HUMAN RESULT
```

---

# 14. PHASE 4 — GET /api/v1/queue

The queue must be deterministic.

Verify:

```text
pending review cases
stable ordering
no duplicates
already-reviewed cases
missing cases
pagination if supported
filters if supported
authorization
```

The reviewer UI must not need to understand the internal Consultation/Image/Analysis service architecture.

That is the purpose of the compatibility layer.

---

# 15. PHASE 5 — GET /api/v1/model

The endpoint must expose actual adapter/model state.

Minimum conceptual contract:

```json
{
  "adapter": "mock",
  "model_version": "retinaguard_resnet18.onnx"
}
```

Use the actual repository response shape if already defined.

Verify:

```text
environment/config source
adapter health
model version
failure state
```

Do not hardcode a fake frontend-only model version.

---

# 16. PHASE 6 — CONTRACT CONSISTENCY

Search the entire repository for:

```text
case_uuid
patient_id
consultation_id
image_id
analysis_id
review_id
model_version
```

Identify inconsistent identifiers.

The system must have clear mappings:

```text
case_uuid
    ↕
consultation
    ↕
image
    ↕
analysis
    ↕
review
```

Do not create a second independent case identity.

---

# 17. PHASE 7 — FRONTEND COMPATIBILITY VERIFICATION

Do not rewrite the frontend.

Verify:

```text
ImageCapture
        ↓
casesService.createCase
        ↓
Consultation patient_id
        ↓
case_uuid
        ↓
AiAnalysis
        ↓
analysisService.run()
        ↓
casesService.getCase()
        ↓
clinical viewer
        ↓
ReviewWorkspace
        ↓
reviewService
        ↓
unified v1 endpoints
```

Test this exact chain.

---

# 18. PHASE 8 — IMAGECAPTURE HARDENING

Verify:

```text
file selection
preview
validation
upload
case creation
loading state
failure state
retry
```

Handle:

```text
no file
invalid type
large file
corrupted file
network failure
backend failure
quality rejection
duplicate submission
```

Never lose the selected local case merely because the network/API fails.

---

# 19. PHASE 9 — AIANALYSIS HARDENING

Preserve:

```text
analysisService.run()
```

Do not replace it with direct low-level model calls from the frontend.

The frontend should observe state through:

```text
casesService.getCase()
```

Verify:

```text
processing state
polling interval
poll termination
success
quality rejection
analysis failure
timeout
retry
```

Do not create infinite polling.

Use a bounded retry/timeout strategy.

---

# 20. PHASE 10 — REVIEWWORKSPACE HARDENING

Verify:

```text
queue
case detail
AI result
confidence
explanation
report
review decision
submission
confirmation
audit
```

The reviewer must clearly understand:

```text
what AI produced
what evidence exists
what the human is deciding
what happens after submission
```

Do not use language that implies autonomous diagnosis.

---

# 21. PHASE 11 — OFFLINE-FIRST VALIDATION

The existing architecture is offline-first.

Day 2 must prove it.

Run an explicit offline test.

### Test

```text
Start application
        ↓
Disable network
        ↓
Create/process case
        ↓
Persist locally
        ↓
Verify case remains available
        ↓
Restore network
        ↓
Sync
        ↓
Verify acknowledgment
```

Network failure must not destroy the case.

---

# 22. PHASE 12 — SYNC / STORE-AND-FORWARD

If the repository already contains sync infrastructure, inspect and complete it.

The target semantics are:

```text
PENDING
IN_FLIGHT
ACKED
FAILED_PERMANENT
```

Each sync item should retain enough information to safely retry:

```text
case_uuid
payload tier/type
attempt count
last attempt
next attempt
payload hash
priority
```

Use the repository's existing names if different.

---

# 23. PHASE 13 — IDEMPOTENT SYNC

This is mandatory.

A retry must not create a duplicate case.

Conceptually:

```text
case_uuid generated once
        ↓
same UUID on every retry
        ↓
server accepts first upload
        ↓
duplicate retry is recognized
        ↓
no duplicate logical case
```

Test:

```text
upload
retry same payload
retry after restart
retry after timeout
```

Expected:

```text
ONE logical case
```

---

# 24. PHASE 14 — SYNC FAILURE HANDLING

Test:

```text
server unavailable
timeout
connection reset
invalid response
duplicate response
partial upload
integrity mismatch
application restart
```

Expected:

```text
case preserved
sync state preserved
retry possible
no duplicate
no silent loss
```

Do not delete failed local cases to make the queue look clean.

---

# 25. PHASE 15 — RECONCILIATION

Implement or verify reconciliation between:

```text
local acknowledged/pending cases
vs
district/server records
```

A discrepancy must become visible.

Example:

```text
Local cases: 100
Server acknowledged: 99

Status:
RECONCILIATION REQUIRED
```

Do not silently force counts to match.

---

# 26. PHASE 16 — DISTRICT API COMPLETION

Where the repository supports district mode, implement/harden:

```http
GET  /api/v1/cases
GET  /api/v1/case/{case_uuid}
GET  /api/v1/case/{case_uuid}/image/{tier}
GET  /api/v1/queue
POST /api/v1/case/{case_uuid}/review
GET  /api/v1/report/{case_uuid}
GET  /api/v1/model
POST /api/v1/sync/{site_id}
GET  /api/v1/metrics
GET  /healthz
```

If a particular endpoint is outside the current implemented scope, document it as:

```text
NOT IMPLEMENTED
```

Do not create a fake endpoint merely to check a box.

---

# 27. PHASE 17 — DISTRICT / EDGE BOUNDARY

Maintain the architectural rule:

```text
EDGE
    ↓
local inference
    ↓
local persistence
    ↓
sync
    ↓
DISTRICT
    ↓
review
    ↓
analytics
```

The district API must NOT become the synchronous inference path.

The mock MATLAB adapter remains the deterministic evaluation path.

---

# 28. PHASE 18 — AUTHENTICATION

Inspect existing authentication first.

If present:

```text
verify it
harden it
test it
```

If the current Path B implementation requires protected reviewer APIs and authentication is absent:

implement the smallest architecture-compatible mechanism.

Test:

```text
valid auth
invalid auth
expired auth
missing auth
logout/session termination
```

Do not build an unnecessary enterprise identity system.

---

# 29. PHASE 19 — RBAC

At minimum preserve the project's actual roles where applicable:

```text
TECHNICIAN
REVIEWER
ADMIN/OPERATOR
```

Authorization must be enforced server-side.

Test:

```text
technician → reviewer route
reviewer → admin route
unauthenticated → protected route
user → another case
```

Expected:

```text
403 / 401
```

as appropriate.

---

# 30. PHASE 20 — CASE ACCESS CONTROL

Attempt:

```text
GET another case UUID
GET another case's image
POST another case review
download another site's report
```

Verify authorization is enforced by the backend.

Never rely on:

```text
hidden UI buttons
frontend route guards
```

as the security boundary.

---

# 31. PHASE 21 — REPORT INTEGRITY

Reports must derive from canonical case state.

Verify:

```text
case_uuid
model version
analysis result
quality state
explanation
review state
timestamps
```

A report-generation failure must not destroy the case.

Report states should be explicit:

```text
AVAILABLE
PARTIAL
UNAVAILABLE
```

where applicable.

---

# 32. PHASE 22 — EXPLAINABILITY INTEGRITY

The application may display:

```text
Grad-CAM
lesion evidence
anatomy/evidence
```

only when the underlying artifact actually exists.

If unavailable:

```text
Explanation unavailable.
```

Do NOT:

```text
generate a fake heatmap
show an unrelated image
reuse a stale explanation
```

Verify that the explanation belongs to the same:

```text
case_uuid
image
analysis result
```

---

# 33. PHASE 23 — MODEL TRACEABILITY

The active configuration is:

```env
MATLAB_ADAPTER=mock
MODEL_VERSION=retinaguard_resnet18.onnx
```

Expose enough metadata to determine:

```text
adapter
model version
model health
```

If an artifact hash exists, surface it where appropriate.

Do not invent hashes.

Do not claim model performance from configuration alone.

---

# 34. PHASE 24 — AUDIT TRAIL

Every important clinical workflow transition should be auditable.

At minimum inspect:

```text
case creation
image processing
analysis completion/failure
review submission
sync state changes
authorization failures
important administrative actions
```

Audit records should identify:

```text
event
timestamp
actor where applicable
case_uuid where applicable
result/status
```

Do not expose sensitive internals unnecessarily.

---

# 35. PHASE 25 — OBSERVABILITY

Add/verify structured logs.

Useful fields:

```text
request_id
case_uuid
event
timestamp
duration
severity
status
```

Useful events:

```text
case.created
image.uploaded
quality.completed
analysis.started
analysis.completed
analysis.failed
report.generated
review.submitted
sync.started
sync.acked
sync.failed
auth.failed
authorization.denied
```

Never log:

```text
raw fundus image
password
secret
full token
```

---

# 36. PHASE 26 — ERROR HANDLING

All errors must be:

```text
structured
safe
actionable
```

Avoid leaking:

```text
stack traces
SQL errors
filesystem paths
environment secrets
internal implementation details
```

Production response:

```json
{
  "error": {
    "code": "...",
    "message": "...",
    "request_id": "..."
  }
}
```

Use the existing project response convention if one already exists.

Do not create competing error schemas.

---

# 37. PHASE 27 — INPUT VALIDATION

Validate all externally controlled inputs.

### Cases

```text
patient/device IDs
image
metadata
```

### Case UUID

Validate format before lookup.

### Review

Validate:

```text
decision
notes if supported
reviewer identity
case state
```

### Query parameters

Validate:

```text
page
limit
filters
dates
status
```

Use existing validation libraries where present.

---

# 38. PHASE 28 — FILE SECURITY

Verify:

```text
extension validation
MIME/content validation
size limits
safe filenames
generated storage keys
path traversal protection
```

Never build storage paths directly from raw user filenames.

Use server-controlled identifiers.

---

# 39. PHASE 29 — DATABASE INTEGRITY

Inspect:

```text
foreign keys
unique constraints
indexes
transactions
nullability
cascade behavior
```

Important invariant:

```text
case_uuid must remain stable.
```

Avoid schema changes unless necessary.

If a schema change is required:

```text
migration
+
backward compatibility
+
test
```

---

# 40. PHASE 30 — PERFORMANCE MEASUREMENT

Do not optimize blindly.

Measure:

```text
backend startup
POST /cases
image upload
quality gate
analysis trigger
GET /case
queue retrieval
review submission
report generation
sync
```

Record actual measurements.

Where meaningful:

```text
N
min
median
P95
max
```

Do not report measurements that were not actually executed.

---

# 41. PHASE 31 — FRONTEND PERFORMANCE

Inspect:

```text
polling frequency
duplicate API calls
large image rendering
queue pagination
unnecessary re-renders
bundle/build size
```

Optimize only where evidence shows a real issue.

Do not rewrite working components for theoretical performance.

---

# 42. PHASE 32 — FAILURE INJECTION

Run explicit failure tests.

## Case creation failure

Expected:

```text
safe error
no orphaned unusable state where avoidable
```

## Image service failure

Expected:

```text
case state remains understandable
retry possible
```

## Analysis failure

Expected:

```text
no fabricated prediction
human/manual path available where supported
```

## Report failure

Expected:

```text
case survives
report marked unavailable
```

## Reviewer service failure

Expected:

```text
review not falsely confirmed
```

## Database restart

Expected:

```text
data survives according to configured persistence
```

---

# 43. PHASE 33 — DUPLICATE TESTING

Test:

```text
double click create
double submit review
retry sync
refresh polling
repeat report generation
```

Expected:

```text
no unintended duplicate case
no duplicate logical review
no corrupted state
```

Use idempotency where the contract requires it.

---

# 44. PHASE 34 — APPLICATION RESTART TEST

Perform:

```text
create case
restart backend
retrieve case
continue workflow
```

Then:

```text
create sync pending state
restart backend
verify queue
retry sync
```

Data must not disappear merely because the process restarted.

---

# 45. PHASE 35 — OFFLINE E2E TEST

Run:

```text
1. Start system
2. Disable network
3. Open frontend
4. Create case
5. Capture/upload image
6. Run local deterministic inference path
7. Store result
8. Verify case locally
9. Re-enable network
10. Sync
11. Verify server ACK
12. Open reviewer queue
13. Review case
14. Verify audit
```

Capture evidence.

---

# 46. PHASE 36 — GOLDEN FIXTURE TEST

The unified API exists specifically to satisfy the Master Prompt / Golden Fixture contract.

Run the Golden Fixture exactly as defined by the repository.

Verify:

```text
POST /api/v1/cases
        ↓
case_uuid
        ↓
GET /api/v1/case/:case_uuid
        ↓
analysis state
        ↓
review
        ↓
GET /api/v1/queue
        ↓
POST /api/v1/case/:case_uuid/review
        ↓
final state
```

Do not modify the Golden Fixture merely to make the implementation pass.

If the fixture exposes a genuine contract mismatch:

```text
identify
fix implementation
rerun
```

---

# 47. PHASE 37 — FULL FRONTEND E2E

Run the actual browser flow.

Exact sequence:

```text
Open RetinaGuard
        ↓
Create/select patient context
        ↓
ImageCapture
        ↓
casesService.createCase
        ↓
case_uuid
        ↓
AiAnalysis
        ↓
analysisService.run()
        ↓
casesService.getCase()
        ↓
result viewer
        ↓
explanation
        ↓
report
        ↓
ReviewWorkspace
        ↓
queue
        ↓
review
        ↓
audit
```

No manual database edits.

No manual API patching during the test.

No stale artifacts.

---

# 48. PHASE 38 — CLEAN-ROOM VERIFICATION

This is mandatory.

Create a clean temporary environment.

Do not carry over:

```text
node_modules
old SQLite DB
old build
old reports
old cache
old sync queue
old screenshots
old generated JSON
```

Install dependencies fresh.

Configure from:

```text
.env.example
```

or the documented setup.

Start:

```text
backend
frontend
```

Run:

```text
health check
Golden Fixture
full E2E
```

The result must be reproducible.

---

# 49. PHASE 39 — STALE ARTIFACT AUDIT

Search for:

```text
old reports
old screenshots
old test JSON
old Grad-CAM
old model output
old DB
```

Verify every evidence artifact corresponds to:

```text
current source
current configuration
current case
current model version
current execution
```

Do not use yesterday's result to prove today's implementation.

---

# 50. PHASE 40 — DEPLOYMENT PACKAGING

Update documentation so another engineer can run the system without tribal knowledge.

README must include:

```text
prerequisites
installation
environment setup
database setup
backend start
frontend start
mock inference mode
real inference mode if supported
tests
Golden Fixture
E2E
build
health check
troubleshooting
```

Create/update:

```text
.env.example
```

Never commit real secrets.

---

# 51. PHASE 41 — DEMO MODE

The evaluation configuration should be explicit.

Example:

```env
MATLAB_ADAPTER=mock
MODEL_VERSION=retinaguard_resnet18.onnx
```

Document:

```text
This is deterministic mock inference for evaluation/demo.
```

Do not hide this from reviewers.

---

# 52. PHASE 42 — DEMO FAILURE PLAN

Prepare safe fallback behavior.

If analysis fails:

```text
case remains visible
failure state shown
manual review path available where supported
```

If district unavailable:

```text
edge continues
sync pending
```

If report fails:

```text
case/result remains available
report retry possible
```

The demo should demonstrate resilience rather than fake success.

---

# 53. PHASE 43 — FINAL SECURITY REVIEW

Perform a targeted security pass.

Check:

```text
secrets
auth
RBAC
case access
image access
file upload
path traversal
SQL injection/vector where relevant
unsafe eval
CORS
request size
error leakage
logging
```

Use the project's existing dependency/security tooling where available.

Fix real findings.

Do not add security theater.

---

# 54. PHASE 44 — FINAL DATA PRIVACY REVIEW

Check every stored field.

Ask:

```text
Is this required?
Who needs it?
Why is it stored?
Is it exposed to the frontend?
Is it logged?
```

Use synthetic fixtures.

Do not introduce unnecessary patient information.

---

# 55. PHASE 45 — FINAL REGRESSION SUITE

Run everything available:

```bash
npm test
npm run lint
npm run build
```

plus repository-specific:

```text
contract tests
integration tests
Golden Fixture
E2E
offline test
sync test
failure test
security test
clean-room test
```

If a command does not exist, do not invent a successful result.

Report:

```text
NOT AVAILABLE
```

and continue with equivalent available verification.

---

# 56. PHASE 46 — RELEASE-CANDIDATE FREEZE

Once P0/P1 issues are resolved:

STOP adding features.

Freeze:

```text
API contract
frontend contract
database schema
compatibility layer
review contract
sync contract
model configuration
demo flow
```

After freeze, only accept:

```text
P0
P1
security
data-integrity
reproducibility
demo-blocking
```

fixes.

---

# 57. PHASE 47 — FINAL DEMO FLOW

The clean demo must run:

```text
1. Start RetinaGuard
2. Confirm API health
3. Confirm deterministic mock configuration
4. Open ImageCapture
5. Create case
6. Upload fundus image
7. Receive case_uuid
8. Run analysis
9. Poll unified GET /case endpoint
10. Display quality state
11. Display AI result
12. Display confidence/decision state
13. Display explanation if available
14. Generate/view report
15. Open ReviewWorkspace
16. Load /api/v1/queue
17. Open case
18. Review evidence
19. Submit human decision
20. Verify audit
21. Demonstrate offline/sync behavior
22. Verify model endpoint
23. Verify final case state
```

This path must be deterministic.

---

# 58. PHASE 48 — FINAL SYSTEM INVARIANTS

Before release, prove these invariants.

## Case

```text
case_uuid is stable
```

## AI

```text
mock output is explicitly mock
```

## Quality

```text
quality failure does not become a DR grade
```

## Review

```text
human review is explicit
```

## Audit

```text
review action is recorded
```

## Offline

```text
network failure does not destroy local case
```

## Sync

```text
retry does not duplicate case
```

## Security

```text
user cannot access unauthorized case
```

## Explainability

```text
displayed artifact belongs to current case/analysis
```

## Reproducibility

```text
clean environment reproduces the demo
```

---

# 59. PHASE 49 — FINAL CLAIM DISCIPLINE

Every project claim must be classified.

Use:

```text
VERIFIED
MEASURED
REQUIRED
TARGET
ASSUMPTION
MOCKED
TO BE VERIFIED
BLOCKED
NOT IMPLEMENTED
```

Never convert:

```text
TARGET → MEASURED
MOCKED → REAL
DESIGN → IMPLEMENTED
IMPLEMENTED → VERIFIED
```

Never claim:

```text
clinical validation
regulatory approval
production clinical deployment
autonomous diagnosis
```

unless explicitly supported by verified project evidence.

---

# 60. FINAL ACCEPTANCE CHECKLIST

## Compatibility Layer

- [ ] `POST /api/v1/cases` verified
- [ ] `GET /api/v1/case/:case_uuid` verified
- [ ] `POST /api/v1/case/:case_uuid/review` verified
- [ ] `GET /api/v1/queue` verified
- [ ] `GET /api/v1/model` verified
- [ ] Existing service architecture preserved
- [ ] No duplicated business logic
- [ ] No frontend-breaking changes

## Frontend

- [ ] ImageCapture works
- [ ] Consultation → case flow works
- [ ] AiAnalysis works
- [ ] Analysis polling works
- [ ] ReviewWorkspace works
- [ ] Queue works
- [ ] Review submission works
- [ ] Error states work
- [ ] Retry states work
- [ ] Offline states work

## Backend

- [ ] Validation
- [ ] Error handling
- [ ] Authorization
- [ ] Logging
- [ ] Request correlation
- [ ] Stable identifiers
- [ ] Safe aggregation
- [ ] Service failures handled

## Offline

- [ ] Local persistence
- [ ] Network-off test
- [ ] Sync queue
- [ ] Retry
- [ ] Idempotency
- [ ] Restart recovery
- [ ] Reconciliation

## Security

- [ ] Auth
- [ ] RBAC
- [ ] Case access control
- [ ] Image access control
- [ ] File validation
- [ ] Path traversal protection
- [ ] No secrets committed
- [ ] No sensitive logging
- [ ] Safe error responses

## Reports / Explainability

- [ ] Current case data
- [ ] Correct model metadata
- [ ] Correct explanation artifact
- [ ] No stale artifact
- [ ] Report failure is recoverable

## Observability

- [ ] Structured logs
- [ ] Request ID
- [ ] Case correlation
- [ ] Latency measurement
- [ ] Sync state visibility
- [ ] Error visibility
- [ ] Model state visibility

## Testing

- [ ] Unit
- [ ] Contract
- [ ] Integration
- [ ] Golden Fixture
- [ ] Frontend E2E
- [ ] Offline E2E
- [ ] Failure injection
- [ ] Duplicate test
- [ ] Restart test
- [ ] Clean-room test

## Deployment

- [ ] `.env.example`
- [ ] README
- [ ] Fresh installation
- [ ] Backend startup
- [ ] Frontend startup
- [ ] Health check
- [ ] Test commands
- [ ] Demo commands
- [ ] Mock mode documented

---

# 61. REQUIRED FINAL DELIVERY REPORT

Create:

```markdown
# RetinaGuard — Engineer 2 Day-2 Delivery Report

## Executive Status

Overall:
Release Candidate:
Golden Fixture:
Frontend E2E:
Offline E2E:
Clean-room:
Security:
Deployment:

---

## 1. Day-1 Baseline Verified

### Confirmed Working
- ...

### Found Broken
- ...

### Found Partial
- ...

### Preserved Architecture
- ...

---

## 2. Compatibility Layer

### POST /api/v1/cases
- Status:
- Evidence:

### GET /api/v1/case/:case_uuid
- Status:
- Evidence:

### POST /api/v1/case/:case_uuid/review
- Status:
- Evidence:

### GET /api/v1/queue
- Status:
- Evidence:

### GET /api/v1/model
- Status:
- Evidence:

---

## 3. Frontend

### ImageCapture
- ...

### AiAnalysis
- ...

### ReviewWorkspace
- ...

---

## 4. Offline / Sync

- Local persistence:
- Queue:
- Retry:
- Idempotency:
- Reconciliation:
- Restart recovery:

---

## 5. Security

- Authentication:
- RBAC:
- Case access:
- Image access:
- File validation:
- Secret handling:
- Logging:

---

## 6. Reports / Explainability

- ...

---

## 7. Observability

- ...

---

## 8. Performance

| Operation | N | Median | P95 | Max |
|---|---:|---:|---:|---:|
| POST /cases | | | | |
| GET /case | | | | |
| Queue | | | | |
| Review | | | | |
| Report | | | | |
| Sync | | | | |

Only populate measurements that were actually run.

---

## 9. Testing

### Unit
- PASS/FAIL/NOT AVAILABLE

### Contract
- PASS/FAIL/NOT AVAILABLE

### Integration
- PASS/FAIL/NOT AVAILABLE

### Golden Fixture
- PASS/FAIL

### Frontend E2E
- PASS/FAIL

### Offline E2E
- PASS/FAIL

### Failure Tests
- PASS/FAIL

### Clean-Room
- PASS/FAIL

---

## 10. Mocked Components

List every mocked component explicitly.

Example:

- MATLAB adapter: mock
- ...

---

## 11. Known Limitations

- ...

---

## 12. Blockers

- ...

---

## 13. Exact Run Commands

```bash
# backend
...

# frontend
...

# tests
...

# Golden Fixture
...

# E2E
...
```

---

## 14. Final Demo Sequence

1.
2.
3.
4.
5.

---

## 15. Evidence

List exact files, test outputs, logs, screenshots, or command results used to support the status.

---

## 16. Release Status

Use exactly one:

VERIFIED RELEASE CANDIDATE

PARTIALLY VERIFIED RELEASE CANDIDATE

BLOCKED

NOT READY
```

---

# 62. FAILURE REPORTING RULE

If something is blocked, do not silently skip it.

Use:

```text
BLOCKER
CAUSE
IMPACT
WHAT WAS VERIFIED
WHAT WAS NOT VERIFIED
SAFE WORKAROUND
NEXT ACTION
```

Example:

```text
BLOCKER:
Real MATLAB adapter unavailable.

CAUSE:
MATLAB runtime not connected to backend.

IMPACT:
Real inference path cannot be verified.

VERIFIED:
Deterministic mock adapter path.

STATUS:
MOCKED / BLOCKED FOR REAL INFERENCE.

NEXT ACTION:
Connect and verify MATLAB adapter separately.
```

Do not convert this into:

```text
MATLAB integration PASS
```

---

# 63. ANTI-GRAVITY EXECUTION RULES

When coding:

```text
Inspect first.
Change second.
Test immediately.
Integrate continuously.
```

When debugging:

```text
Reproduce.
Trace.
Identify root cause.
Fix smallest layer.
Regression test.
```

When uncertain:

```text
Repository
→ Existing contract
→ Project blueprint
→ Safest reversible implementation
```

When blocked:

```text
Isolate blocker.
Document it.
Continue independent work.
Do not fake completion.
```

When a feature already works:

```text
DO NOT REWRITE IT.
```

When an abstraction is ugly but stable:

```text
KEEP IT unless it causes a real defect.
```

When a new architecture seems "cleaner":

```text
DO NOT introduce it merely for elegance.
```

---

# 64. FINAL COMMAND

Start execution now.

Your first actions MUST be:

```text
1. Read the existing repository.
2. Inspect the Day-1 compatibility-layer implementation.
3. Run the backend.
4. Run the frontend.
5. Verify all five unified v1 endpoints.
6. Trace the full frontend flow.
7. Run existing tests/Golden Fixture.
8. Build the Day-2 gap matrix.
9. Fix P0 defects first.
10. Continue through the phases in dependency order.
```

Do not begin with a rewrite.

Do not assume the Day-1 implementation is perfect.

Do not discard the existing granular service architecture.

Do not break the existing React frontend.

Do not replace the deterministic mock configuration.

Do not invent results.

Do not fabricate evidence.

The final system must prove this complete path:

```text
                    RETINAGUARD DAY-2 TARGET

                     React Frontend
                           │
                           ▼
                 Unified /api/v1 Contract
                           │
                           ▼
               Cases Compatibility Layer
                           │
          ┌────────────────┼─────────────────┐
          ▼                ▼                 ▼
   Consultation       Image Service    Analysis Service
          │                │                 │
          └────────────────┼─────────────────┘
                           ▼
                    Reviewer Service
                           │
                           ▼
                  SQLite / Local State
                           │
                           ▼
                    Offline Outbox
                           │
                    Network Available
                           │
                           ▼
                    District / Sync
                           │
                           ▼
                    Reviewer Queue
                           │
                           ▼
                    Human Decision
                           │
                           ▼
                       Audit
                           │
                           ▼
                 Metrics / Operations
```

The Day-2 finish line is:

> **A unified-v1 RetinaGuard system that preserves the existing Consultation/Image/Analysis/Reviewer architecture, keeps the existing React clinical workflow intact, runs deterministically with the configured mock MATLAB adapter, survives offline and failure conditions, supports auditable human review, exposes stable API contracts, passes the Golden Fixture and full E2E path, and can be rebuilt and demonstrated from a clean environment without stale artifacts or fabricated evidence.**

**Execute.**
