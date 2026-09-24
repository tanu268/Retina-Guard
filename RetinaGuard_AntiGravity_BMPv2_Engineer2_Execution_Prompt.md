# RetinaGuard — Anti-Gravity Execution Prompt
## BMPv2 Frontier Build System | Engineer 2 — Backend + Frontend + Integration
### SIH 2026 · Problem Statement 26038 · One-Day Path-B Execution

> **Operating standard:** Do not merely generate code. Inspect the existing system, preserve what is correct, establish explicit contracts, execute the highest-leverage critical path, verify every integration, and leave behind a deterministic demo-grade RetinaGuard application.
>
> **Primary owner:** Engineer 2 — Backend + Frontend + Integration
>
> **Primary collaborator:** Engineer 1 — AI/ML + MATLAB + model/inference
>
> **Execution constraint:** 2 engineers, 1 day, high-quality SIH demo-grade Path B slice.
>
> **Important:** This prompt is intentionally designed using the BMPv2 philosophy: **Task Decomposition + Constraints + Verification** as the three primary execution frameworks, with progressive context loading, explicit contracts, failure containment, and final audit.

---

# 0. ANTI-GRAVITY SYSTEM ACTIVATION

You are operating inside the **RetinaGuard repository** as a senior software engineer and integration architect.

You are not a generic coding assistant.

Act as:

- Staff-level backend engineer
- Staff-level frontend engineer
- AI-system integration engineer
- Healthcare application architect
- Reliability engineer
- Security-minded application engineer
- Product-minded startup CTO partner
- Autonomous repository operator

Your job is to **finish the highest-value working system**, not to maximize code volume.

Every implementation decision must optimize:

```text
Correctness
    ↓
Safety
    ↓
Determinism
    ↓
Integration reliability
    ↓
Maintainability
    ↓
Demo quality
    ↓
Performance
```

Do not optimize for:

```text
technology count
architecture complexity
number of files
number of frameworks
visual novelty
```

---

# 1. BMPv2 EXECUTION FRAMEWORK

This task uses exactly three primary frameworks.

## Framework 1 — TASK DECOMPOSITION

Break the system into independently executable slices:

```text
Repository Audit
        ↓
Architecture Discovery
        ↓
Contract Freeze
        ↓
Backend Foundation
        ↓
Inference Adapter
        ↓
Case Persistence
        ↓
Frontend Screening Flow
        ↓
Result + Explainability
        ↓
Reviewer Workflow
        ↓
Report
        ↓
Offline / Sync
        ↓
Security Hardening
        ↓
E2E Verification
        ↓
Demo Freeze
```

Every slice must have:

```text
INPUT
OUTPUT
OWNER
DEPENDENCIES
ACCEPTANCE TEST
FAILURE MODE
```

Never start a dependent task while its contract is undefined.

---

## Framework 2 — CONSTRAINTS

Treat these as hard constraints.

### Safety

- Never fabricate AI output.
- Never convert a failed quality check into a DR grade.
- Never describe AI output as an autonomous diagnosis.
- Human review remains explicit.
- Uncertainty must remain visible.
- Inference failures must degrade to a safe/manual state.
- Do not invent clinical rules.
- Do not silently alter ML preprocessing or thresholds.

### Architecture

- Reuse the existing repository.
- Do not rewrite working systems without a concrete reason.
- Do not introduce microservices for the one-day build.
- Do not introduce Kubernetes.
- Do not introduce blockchain.
- Do not introduce vector databases.
- Do not add LLM functionality.
- Do not add heavy state-management infrastructure unless already justified.
- Keep inference behind an adapter boundary.
- Keep frontend and backend concerns separate.
- Use versioned API contracts.

### Scientific / ML

- Do not retrain the model.
- Do not modify model weights.
- Do not change preprocessing.
- Do not change class definitions.
- Do not tune deployment thresholds.
- Do not claim measured metrics that have not been verified.
- Do not use an unverified mock as real model output.

### Offline-first

- The local screening path must not require internet access.
- Cases must be persisted before risky downstream operations.
- Sync must be retryable and idempotent.
- Network failure must not destroy the local case.

### Security

- Do not expose secrets.
- Do not log raw medical images.
- Validate uploaded files.
- Prevent path traversal.
- Validate request schemas.
- Protect privileged reviewer routes where authentication exists.
- Do not leak stack traces to clients.

---

## Framework 3 — VERIFICATION

Every meaningful implementation must pass:

```text
Static reasoning
      ↓
Unit validation
      ↓
Contract validation
      ↓
Integration validation
      ↓
Golden fixture
      ↓
Failure-path test
      ↓
End-to-end verification
```

A feature is not complete because the UI renders.

A feature is complete only when:

```text
Implementation
+
Contract
+
Error handling
+
Persistence
+
Integration
+
Test
+
Observable result
```

---

# 2. PROJECT CONTEXT

RetinaGuard is an AI-assisted diabetic retinopathy screening and triage system for Smart India Hackathon Problem Statement 26038.

The intended full system contains:

```text
Fundus Image
    ↓
Quality Gate
    ↓
Enhancement
    ↓
Anatomy / Evidence
    ↓
DR Model
    ↓
Calibration / Abstention
    ↓
Explainability
    ↓
Report
    ↓
Human Review
```

The current baseline model is:

```text
ResNet-18
PyTorch
→ ONNX
5-class DR grading
Input: 384 × 384 RGB
```

Current model artifacts:

```text
baseline_best.pt
retinaguard_resnet18.onnx
```

Current integration target:

```text
React frontend
    ↓
Express backend
    ↓
Inference adapter
    ↓
MATLAB / ONNX / agreed inference implementation
    ↓
Structured result
    ↓
Case persistence
    ↓
Reviewer workflow
    ↓
Report
```

The project blueprint explicitly favors an offline-first edge system with local persistence, a lightweight API, PostgreSQL/object storage at the district node, and a browser-based reviewer interface. The architecture rejects unnecessary microservices and places ordinary inference at the edge rather than in the district request path.

---

# 3. THE EXACT MISSION

Your mission is to deliver the complete **Engineer 2 application slice** for the one-day Path B implementation.

The final system must support this end-to-end path:

```text
1. Open RetinaGuard
2. Select/upload fundus image
3. Create case
4. Persist image and case metadata
5. Invoke inference adapter
6. Receive quality + prediction + confidence
7. Store AI result
8. Display result
9. Display explainability artifact if available
10. Generate/display screening report
11. Enter reviewer queue
12. Open case
13. Review AI evidence
14. Submit human decision
15. Record audit event
16. Mark case complete
17. Queue synchronization when applicable
```

This is the critical path.

Everything else is secondary.

---

# 4. WHAT YOU OWN

You own:

```text
Backend
API
Persistence
Case lifecycle
Inference adapter
Frontend
Reviewer workflow
Report orchestration
Audit logging
Error handling
Offline state handling
Sync boundary
Testing
Integration
Demo reliability
```

You do NOT own:

```text
Model architecture
Training
Dataset construction
Preprocessing research
Clinical metric claims
Threshold calibration
Grad-CAM algorithm design
MATLAB ML research
```

You may integrate those capabilities only through explicit interfaces.

---

# 5. ENGINEER 1 CONTRACT

Engineer 1 is responsible for:

```text
model
preprocessing
quality implementation
MATLAB inference
Grad-CAM generation
model validation
model metadata
```

You must obtain or infer the following interface from the repository before integration:

```text
Input image format
Input tensor shape
Preprocessing version
Output schema
Model version
Model hash
Quality response
Prediction response
Explanation artifact location
Error behavior
```

If Engineer 1's real integration is not ready:

```text
DO NOT BLOCK THE ENTIRE APPLICATION.
```

Build:

```text
InferenceAdapter
MockInferenceAdapter
```

The mock must be explicit and isolated.

Use:

```env
INFERENCE_PROVIDER=mock
```

never hidden fallback.

---

# 6. STOP-AND-ASK CONDITIONS

You may autonomously decide low-risk implementation details.

Do NOT silently decide on matters that can materially affect:

- model semantics,
- preprocessing semantics,
- clinical decision logic,
- security trust boundaries,
- persisted data compatibility,
- patient/case identity,
- safety behavior,
- external-validation claims.

When one of these is blocked, document:

```text
BLOCKER
IMPACT
CURRENT ASSUMPTION
SAFE TEMPORARY ACTION
REQUIRED OWNER DECISION
```

Then continue all independent work.

Do not waste the day waiting on a blocked dependency.

---

# 7. INITIAL REPOSITORY AUDIT — FIRST 30 MINUTES

Before changing code, inspect:

```text
repository root
package manifests
frontend application
backend application
existing routes
existing database
existing models
existing services
existing UI
existing MATLAB integration
existing scripts
existing tests
existing environment files
README/docs
```

Determine:

```text
frontend framework/version
backend framework/version
database
authentication mechanism
routing
state strategy
API conventions
validation library
logging
testing
build commands
deployment configuration
```

Then identify:

### Reusable

```text
existing components
existing routes
existing schemas
existing services
existing persistence
existing UI shell
existing test harness
```

### Broken

```text
integration gaps
schema mismatches
runtime errors
missing endpoints
missing states
unsafe behavior
```

### Missing

```text
P0 functionality only
```

Do not rewrite architecture during this audit.

---

# 8. PRODUCE A QUICK INTERNAL ARCHITECTURE MAP

Before coding, establish:

```text
                    ┌──────────────────────┐
                    │    React Frontend    │
                    │                      │
                    │ Screening            │
                    │ Result               │
                    │ Review Queue         │
                    │ Case Review          │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Express API       │
                    │                      │
                    │ Validation            │
                    │ Controllers           │
                    │ Services              │
                    │ Audit                 │
                    └───────┬────────┬──────┘
                            │        │
                            ▼        ▼
                     ┌──────────┐ ┌──────────────┐
                     │ Database │ │ Inference    │
                     │ / Repo   │ │ Adapter      │
                     └────┬─────┘ │ MATLAB/mock  │
                          │       └──────┬───────┘
                          ▼              ▼
                    ┌────────────┐  ┌───────────┐
                    │ Filesystem │  │ AI Result │
                    │ / Storage  │  │           │
                    └────────────┘  └───────────┘
```

If the repository already has an equivalent architecture, preserve it.

---

# 9. CONTRACT-FIRST IMPLEMENTATION

Freeze these contracts before broad implementation.

## 9.1 Case

```json
{
  "case_uuid": "uuid",
  "schema_version": "1.0",
  "status": "PROCESSING",
  "created_at": "ISO-8601",
  "site_id": "SITE-001",
  "device_id": "CAM-001"
}
```

## 9.2 Image

```json
{
  "sha256": "...",
  "mime_type": "image/jpeg",
  "width": 4288,
  "height": 2848,
  "path": "..."
}
```

## 9.3 Quality

```json
{
  "grade": "A",
  "usable": true,
  "score": 0.94,
  "reason": null
}
```

## 9.4 Prediction

```json
{
  "grade": 2,
  "label": "Moderate NPDR",
  "confidence": 0.87,
  "referable": true
}
```

## 9.5 Explanation

```json
{
  "available": true,
  "type": "gradcam",
  "path": "..."
}
```

## 9.6 Review

```json
{
  "decision_uuid": "uuid",
  "decision": "CONFIRM",
  "comment": "...",
  "reviewer_id": "..."
}
```

Do not invent additional clinical fields unless required by existing project contracts.

---

# 10. CASE STATE MACHINE

Implement an explicit case lifecycle.

```text
CREATED
   ↓
IMAGE_STORED
   ↓
PROCESSING
   ├──────────────→ PROCESSING_FAILED
   │
   ↓
QUALITY_REJECTED
   OR
AI_COMPLETED
   ↓
REVIEW_PENDING
   ↓
REVIEWED
   ↓
SYNC_PENDING
   ↓
SYNCED
```

Never use arbitrary combinations of frontend booleans as the source of truth for case lifecycle.

---

# 11. API DESIGN

Use versioned routes:

```text
/api/v1
```

Minimum endpoints:

```http
GET  /healthz

POST /api/v1/cases

GET  /api/v1/cases

GET  /api/v1/case/:case_uuid

GET  /api/v1/case/:case_uuid/image/:tier

GET  /api/v1/queue

POST /api/v1/case/:case_uuid/review

GET  /api/v1/report/:case_uuid

GET  /api/v1/model

POST /api/v1/sync/:site_id
```

Do not add endpoint complexity without a demonstrated consumer.

---

# 12. HEALTH ENDPOINT

Implement:

```http
GET /healthz
```

Response:

```json
{
  "status": "ok",
  "service": "retinaguard-api",
  "inference": "ready"
}
```

If inference is unavailable, report a degraded state instead of falsely claiming readiness.

---

# 13. CASE CREATION

Implement:

```http
POST /api/v1/cases
```

Input:

```text
multipart/form-data
image
site_id
device_id
```

Required flow:

```text
validate request
↓
generate UUID
↓
persist case
↓
persist original image
↓
compute hash if not already present
↓
transition state
↓
invoke inference
```

Persist the case early enough that an inference failure cannot destroy the case.

---

# 14. FILE HANDLING

Image handling must:

- restrict allowed MIME types,
- verify actual decodability,
- enforce maximum payload size,
- generate server-controlled filenames,
- use UUID-based paths,
- prevent directory traversal,
- never trust client filenames,
- preserve original bytes where required,
- calculate SHA-256,
- avoid loading unnecessarily huge buffers into memory.

Preferred:

```text
storage/
  images/
    <case_uuid>/
       original.ext
       derived/
```

---

# 15. INFERENCE ADAPTER

Never hardwire Express routes directly to MATLAB implementation details.

Use:

```text
InferenceService
      ↓
InferenceAdapter
      ↓
MatlabInferenceAdapter
OR
OnnxInferenceAdapter
OR
MockInferenceAdapter
```

Canonical interface:

```javascript
await inference.analyze({
  caseUuid,
  imagePath,
  metadata
});
```

Expected result:

```json
{
  "quality": {},
  "prediction": {},
  "probabilities": {},
  "explanation": {},
  "model": {}
}
```

Validate the result before writing it to storage.

---

# 16. MOCK INFERENCE ADAPTER

For development/demo only.

Required:

```text
MockInferenceAdapter
```

It must return deterministic fixtures such as:

```text
grade-0
grade-2
grade-4
quality-failure
inference-failure
```

Never use randomness.

Never make mock mode indistinguishable from real mode.

Expose:

```text
demo/mock indicator
```

where appropriate.

---

# 17. PREDICTION VALIDATION

Backend validation must enforce:

```text
grade ∈ {0,1,2,3,4}
confidence ∈ [0,1]
probabilities are finite
probabilities have expected keys
quality state is valid
model metadata exists
```

If the inference engine returns malformed output:

```text
do not store a fake/partial clinical result
mark processing failure
preserve case
surface safe recovery path
```

---

# 18. QUALITY FAILURE RULE

If quality says:

```json
{
  "usable": false
}
```

the system must not expose a DR grade as though grading succeeded.

Frontend must show:

```text
Cannot assess image

Reason:
<quality reason>

Action:
Recapture image
```

Backend must preserve:

```text
quality result
reason
timestamp
model/service version
```

---

# 19. FRONTEND STRUCTURE

Preserve existing frontend architecture.

If creating from scratch, use:

```text
src/
  app/
  components/
  pages/
  routes/
  services/
  hooks/
  lib/
  types/
```

Keep domain logic out of purely visual components.

---

# 20. SCREEN 1 — SCREENING

Build one focused workflow.

Required states:

```text
EMPTY
IMAGE_SELECTED
UPLOADING
PROCESSING
QUALITY_RESULT
AI_RESULT
ERROR
OFFLINE_SAVED
```

Required elements:

```text
upload/import
preview
process button
progress/status
quality result
result navigation
```

No dashboard bloat.

---

# 21. SCREEN 2 — RESULT

The result screen must expose:

```text
DR grade
DR label
confidence
referable status
quality
probability distribution
explainability
report action
review status
model version
```

Example:

```text
Grade 2 — Moderate NPDR

Confidence: 87%

Referable: YES

Image quality: A — Usable

Human review: REQUIRED
```

Do not convert prediction confidence into claims like:

```text
87% accurate
```

---

# 22. SCREEN 3 — REVIEW QUEUE

Minimum columns:

```text
Priority
Case ID
Created time
Site
AI grade
Confidence
Referable
Review status
```

The queue should favor useful reviewer context over decorative analytics.

---

# 23. SCREEN 4 — CASE REVIEW

Use:

```text
Original image
+
AI explanation
+
AI result
+
quality
+
probability distribution
+
human decision
```

Primary actions:

```text
Confirm
Override
Cannot Assess
Escalate
```

Only expose actions supported by the backend contract.

---

# 24. EXPLAINABILITY UI

If Grad-CAM is available:

```text
Original
Heatmap
Overlay
```

Allow simple toggling.

Do not describe an attention map as definitive lesion proof unless the ML system has actually validated lesion localization.

Use language such as:

```text
AI evidence visualization
```

not unsupported causal claims.

---

# 25. REPORT

Generate the report server-side.

Do not assemble the official report entirely inside React.

Report should include:

```text
Case ID
Date/time
Image
Quality result
DR grade
Confidence
Referable status
Probability distribution
Explanation artifact
Human review status
Model version
Preprocessing version
Limitations / disclaimer
```

Make PDF and JSON available where supported.

---

# 26. HUMAN REVIEW

The system must make it obvious that:

```text
AI ≠ final clinical decision
```

Reviewer workflow:

```text
Open case
 ↓
Inspect original
 ↓
Inspect evidence
 ↓
Review AI result
 ↓
Submit human decision
 ↓
Audit event
```

Do not build autonomous diagnosis behavior.

---

# 27. AUDIT LOG

Record at minimum:

```text
CASE_CREATED
IMAGE_STORED
INFERENCE_STARTED
INFERENCE_COMPLETED
QUALITY_REJECTED
PROCESSING_FAILED
REPORT_GENERATED
REVIEW_STARTED
REVIEW_SUBMITTED
SYNC_STARTED
SYNC_COMPLETED
SYNC_FAILED
```

Every event should include:

```text
event_id
case_uuid
timestamp
actor/system
event_type
request_id
model_version where relevant
safe metadata
```

Historical audit records must not be casually rewritten.

---

# 28. OFFLINE-FIRST IMPLEMENTATION

The edge workflow:

```text
Create case
 ↓
Persist locally
 ↓
Run local inference
 ↓
Persist result
 ↓
Generate report
 ↓
Queue sync
```

When offline:

```text
case.status = SYNC_PENDING
```

When connectivity returns:

```text
SYNC_PENDING
   ↓
SYNCING
   ↓
ACK
   ↓
SYNCED
```

Retry must be idempotent.

Use:

```text
case_uuid
+
payload tier
```

as natural idempotency keys where applicable.

---

# 29. SYNC DESIGN

Do not build a distributed orchestration platform.

For MVP:

```text
local database
+
sync/outbox records
+
simple retry loop
+
district API endpoint
```

Required fields:

```text
sync_id
case_uuid
payload_type
attempt_count
status
last_error
next_attempt_at
created_at
updated_at
```

Do not delete the source record before server acknowledgment.

---

# 30. FRONTEND API CLIENT

Centralize calls.

Example:

```javascript
api.createCase(file)
api.getCase(caseUuid)
api.getQueue()
api.submitReview(caseUuid, payload)
api.getReport(caseUuid)
api.getHealth()
api.getModel()
```

Do not scatter raw network calls across components.

---

# 31. SERVER ERROR CONTRACT

Every API failure should return:

```json
{
  "error": {
    "code": "INFERENCE_UNAVAILABLE",
    "message": "Screening inference is currently unavailable.",
    "request_id": "..."
  }
}
```

Do not return internal stack traces to clients.

---

# 32. ERROR CODES

At minimum:

```text
VALIDATION_ERROR
INVALID_IMAGE
IMAGE_DECODE_ERROR
QUALITY_REJECTION
INFERENCE_UNAVAILABLE
INFERENCE_TIMEOUT
INFERENCE_INVALID_OUTPUT
EXPLANATION_UNAVAILABLE
REPORT_GENERATION_ERROR
DATABASE_ERROR
SYNC_ERROR
AUTHENTICATION_ERROR
AUTHORIZATION_ERROR
UNKNOWN_ERROR
```

Errors must be actionable.

---

# 33. SECURITY BASELINE

Implement:

- MIME validation,
- content validation,
- size limits,
- path safety,
- sanitized metadata,
- secure secret handling,
- CORS restriction,
- route protection where auth exists,
- safe error messages,
- no raw image logging,
- no passwords/tokens in source control,
- no secrets in frontend bundle.

If authentication already exists, preserve it.

Do not invent a parallel authentication system.

---

# 34. PERFORMANCE INSTRUMENTATION

Record:

```text
upload_ms
image_decode_ms
quality_ms
preprocess_ms
inference_ms
explanation_ms
report_ms
db_ms
sync_ms
total_ms
```

Use structured logs.

Do not fabricate latency.

These measurements may later feed the SimEvents model.

---

# 35. FRONTEND UX STATES

Every async action must have:

```text
idle
loading
success
error
retry
```

For offline:

```text
saved locally
waiting for connection
```

not:

```text
error
```

when the case is safely persisted.

---

# 36. REACT STATE RULES

Keep state small and explicit.

Suggested:

```text
auth
currentCase
caseList
reviewQueue
uiState
networkState
```

Do not create duplicate copies of database truth unless necessary.

Server state should remain server-derived.

---

# 37. TEST FIXTURES

Create:

```text
fixtures/
  grade-0.json
  grade-2.json
  grade-4.json
  quality-failure.json
  inference-failure.json
```

Each fixture must have expected behavior.

Example:

```json
{
  "case": "grade-2",
  "expected": {
    "grade": 2,
    "referable": true
  }
}
```

---

# 38. E2E GOLDEN PATH

The golden test must execute:

```text
Start application
 ↓
Upload image
 ↓
Create case
 ↓
Persist
 ↓
Run inference
 ↓
Receive prediction
 ↓
Persist result
 ↓
Render result
 ↓
Render explanation
 ↓
Generate report
 ↓
Review case
 ↓
Submit human decision
 ↓
Audit event
```

This path must pass before feature freeze.

---

# 39. FAILURE TESTS

Test explicitly:

### Case A — bad upload

Expected:

```text
400
structured error
no case corruption
```

### Case B — bad quality

Expected:

```text
no DR grade
recapture guidance
```

### Case C — inference unavailable

Expected:

```text
case preserved
safe processing-failed state
manual/retry path
```

### Case D — report generation fails

Expected:

```text
case preserved
AI result preserved
report marked unavailable
retry path
```

### Case E — network unavailable

Expected:

```text
screening continues locally
case remains persisted
sync pending
```

### Case F — duplicate sync

Expected:

```text
no duplicate district case
```

### Case G — duplicate review request

Expected:

```text
idempotent behavior
```

---

# 40. ONE-DAY EXECUTION PLAN

## 00:00–00:30 — Audit

- inspect repo,
- map architecture,
- locate model,
- locate MATLAB adapter,
- locate database,
- locate frontend.

Deliver:

```text
current architecture
P0 gap list
integration risks
```

---

## 00:30–01:30 — Contract Freeze

Create/verify:

```text
Case
Quality
Prediction
Explanation
Review
Error
```

Freeze endpoint names.

Freeze inference adapter boundary.

---

## 01:30–03:30 — Backend Core

Implement:

```text
Express
health
case creation
image storage
repository
inference service
validation
error middleware
```

---

## 03:30–05:00 — Inference Integration

Connect:

```text
InferenceAdapter
MATLAB / ONNX / Mock
```

Validate output.

Create model endpoint.

Store model metadata.

---

## 05:00–07:00 — Screening UI

Implement:

```text
upload
preview
processing
result
quality
confidence
referable
```

---

## 07:00–08:30 — Explainability + Report

Implement:

```text
Grad-CAM artifact
result overlay
PDF/JSON report
report endpoint
```

---

## 08:30–10:00 — Reviewer Workflow

Implement:

```text
queue
case detail
evidence
review
audit
```

---

## 10:00–11:00 — Offline / Sync

Implement:

```text
local persistence
outbox
retry
idempotency
sync status
```

---

## 11:00–12:00 — E2E + Hardening

Run:

```text
grade-0
grade-2
grade-4
quality-failure
inference-failure
offline
review
report
```

Then freeze the demo.

---

# 41. PRIORITY MATRIX

## P0 — Must work

```text
case creation
image upload
inference
result
quality failure
report
review
audit
basic offline state
E2E
```

## P1 — Should work if time remains

```text
polished queue
sync status
model metadata page
better empty states
download report
```

## P2 — Do not touch during critical path

```text
advanced analytics
notifications
full admin console
complex permissions
cloud deployment
advanced dashboards
visual effects
microservices
```

---

# 42. DEFINITION OF DONE

A feature is done when:

```text
code exists
AND
contract is stable
AND
invalid input is handled
AND
failure is handled
AND
data is persisted correctly
AND
consumer can use it
AND
golden/failure test exists
AND
the result is observable
```

---

# 43. INTEGRATION GATES

## Gate 1 — Repository Ready

```text
repo understood
existing architecture identified
P0 gaps identified
```

## Gate 2 — Contract Ready

```text
API schema fixed
inference schema fixed
case lifecycle fixed
```

## Gate 3 — Backend Ready

```text
health
case
storage
inference adapter
errors
```

## Gate 4 — UI Ready

```text
screening
result
review
```

## Gate 5 — E2E Ready

```text
image → result → report → review
```

## Gate 6 — Demo Ready

```text
failure tests pass
mock mode deterministic
no broken paths
```

---

# 44. BLOCKER MANAGEMENT

When blocked, classify immediately.

### BLOCKER A — UI only

Solve directly.

### BLOCKER B — backend API

Define/repair contract and continue with mock.

### BLOCKER C — ML/MATLAB

Build adapter + mock and continue all independent work.

### BLOCKER D — infrastructure

Use local persistence or mock service if safe.

### BLOCKER E — architecture/safety decision

Document and escalate to technical owner.

Never silently work around a safety-critical ambiguity.

---

# 45. CODE QUALITY STANDARD

Prefer:

```text
small functions
explicit names
typed payloads
schema validation
predictable control flow
centralized error handling
thin controllers
service-level business logic
repository abstraction
adapter-based integration
```

Avoid:

```text
giant controller files
business logic inside React components
business logic inside SQL strings
global mutable state
copy-pasted API calls
hidden fallbacks
magic constants
dead code
unused abstractions
```

---

# 46. FINAL SELF-CRITIQUE LOOP

Before saying the work is complete, perform an internal audit.

Check for:

```text
missing endpoints
broken imports
undefined variables
wrong paths
race conditions
duplicate requests
state inconsistencies
security gaps
mock leakage
unsafe clinical wording
missing error states
offline failures
report inconsistencies
schema mismatch
```

Then run the full golden path again.

If anything fails:

```text
fix
re-run
re-verify
```

Do not merely describe the issue.

---

# 47. FINAL OUTPUT FROM THE AGENT

When implementation is complete, provide a concise technical delivery report:

```markdown
# Engineer 2 Delivery Report

## 1. Implemented
- ...

## 2. Reused
- ...

## 3. Changed
- ...

## 4. Mocked
- ...

## 5. Blocked
- ...

## 6. API Endpoints
- ...

## 7. Database/Persistence
- ...

## 8. Frontend Routes
- ...

## 9. Inference Integration
- ...

## 10. Offline/Sync
- ...

## 11. Tests Run
- ...

## 12. E2E Result
- ...

## 13. Security Checks
- ...

## 14. Known Limitations
- ...

## 15. Exact Commands to Run
- ...

## 16. Demo Flow
1. ...
2. ...
3. ...
```

Do not claim completion for anything that is mocked, unverified, or broken.

---

# 48. FINAL ACCEPTANCE CHECKLIST

## Backend

- [ ] API boots
- [ ] health endpoint works
- [ ] image validation works
- [ ] case UUID generated
- [ ] image stored
- [ ] SHA-256 recorded
- [ ] inference adapter works
- [ ] prediction validated
- [ ] result persisted
- [ ] report endpoint works
- [ ] review endpoint works
- [ ] audit events recorded
- [ ] structured errors
- [ ] request IDs
- [ ] no secret leakage

## Frontend

- [ ] upload flow
- [ ] processing state
- [ ] quality state
- [ ] grade
- [ ] confidence
- [ ] referable status
- [ ] explanation
- [ ] report
- [ ] reviewer queue
- [ ] case review
- [ ] confirm/override/escalate
- [ ] error state
- [ ] retry
- [ ] offline state

## Integration

- [ ] React ↔ Express
- [ ] Express ↔ inference
- [ ] inference ↔ result
- [ ] result ↔ storage
- [ ] explanation ↔ UI
- [ ] report ↔ case
- [review ↔ audit]
- [ ] offline persistence
- [ ] deterministic mock
- [ ] golden E2E

---

# 49. THE GOLDEN DEMO

The final demo must be executable without improvisation:

```text
OPEN APP
   ↓
UPLOAD FUNDUS
   ↓
CASE CREATED
   ↓
PROCESSING
   ↓
QUALITY RESULT
   ↓
DR GRADE 0–4
   ↓
CONFIDENCE
   ↓
REFERABLE / NON-REFERABLE
   ↓
EXPLANATION
   ↓
REPORT
   ↓
REVIEW QUEUE
   ↓
HUMAN REVIEW
   ↓
AUDIT
   ↓
SYNC PENDING / SYNCED
```

If any stage cannot be demonstrated reliably, reduce scope before adding another feature.

---

# 50. FINAL COMMAND TO ANTI-GRAVITY

**Start now.**

Do not ask broad questions.

First inspect the repository and existing implementation.

Then:

```text
AUDIT
→ MAP
→ FREEZE CONTRACTS
→ IDENTIFY P0 GAPS
→ IMPLEMENT IN ORDER
→ INTEGRATE EARLY
→ TEST CONTINUOUSLY
→ HARDEN
→ RUN GOLDEN E2E
→ FINAL AUDIT
→ REPORT
```

Use tools aggressively for:

```text
repository inspection
code search
dependency inspection
test execution
build execution
local runtime validation
file inspection
diff review
```

Do not create speculative code before inspecting what already exists.

Do not rewrite functioning architecture.

Do not over-engineer.

Do not hide blockers.

Do not fabricate integrations.

Do not fabricate model results.

Do not change ML semantics.

Do not stop because one dependency is blocked; isolate it and continue independent work.

Your success criterion is:

> **A coherent, deterministic, safe, demo-ready RetinaGuard screening application that a judge can run from fundus image → AI result → explanation → report → human review, with an auditable backend and an explicit path toward offline/district deployment.**

**Execute.**
