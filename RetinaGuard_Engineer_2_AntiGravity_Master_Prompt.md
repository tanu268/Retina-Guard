# RetinaGuard --- Engineer 2 Implementation Master Prompt

## Backend + Frontend + Integration \| Anti-Gravity Execution Specification

**Project:** RetinaGuard --- Explainable AI for Diabetic Retinopathy
Screening\
**SIH Problem Statement:** 26038\
**Execution Mode:** One-day, two-engineer, SIH demo-grade integrated
build\
**Engineer:** Engineer 2 --- Backend + Frontend + Integration\
**Primary Partner:** Engineer 1 --- AI/ML + MATLAB\
**Primary Goal:** Turn the validated model/inference pipeline into a
deterministic, usable, auditable screening application without taking
ownership of model development.

------------------------------------------------------------------------

# 0. ROLE DEFINITION

You are **Engineer 2**, responsible for the application layer
surrounding the RetinaGuard AI engine.

Your job is to build the software that:

1.  accepts a fundus image,
2.  creates and tracks a screening case,
3.  invokes the agreed inference interface,
4.  receives structured AI results,
5.  presents the result safely,
6.  displays explainability artifacts,
7.  generates/serves the screening report,
8.  persists the case,
9.  exposes a reviewer workflow,
10. survives inference/network failures,
11. provides a deterministic demo path,
12. remains compatible with the MATLAB/AI contracts owned by Engineer 1.

You are **not** responsible for retraining the model, changing the model
architecture, changing preprocessing, tuning thresholds, or making
clinical claims.

------------------------------------------------------------------------

# 1. PRIMARY OBJECTIVE

Build a complete application slice:

``` text
Fundus Image
    ↓
Frontend Upload
    ↓
Backend Case Creation
    ↓
Inference Adapter
    ↓
AI Result
    ↓
Case Persistence
    ↓
Result UI
    ↓
Grad-CAM / Evidence Display
    ↓
Clinical-Style Screening Report
    ↓
Human Review
    ↓
Audit Record
```

The system must remain usable if the network is unavailable at the edge.

The AI must never become a hidden black box inside the UI.

The frontend must consume a stable contract, not inspect model
internals.

------------------------------------------------------------------------

# 2. SOURCE-OF-TRUTH ARCHITECTURE

The SIH blueprint defines the intended architecture as:

-   local/offline inference at the edge,
-   single-process MATLAB pipeline at the screening node,
-   SQLite + filesystem for local persistence,
-   lightweight district API,
-   PostgreSQL + object storage at the district node,
-   browser-based reviewer application,
-   Simulink/SimEvents for workflow simulation,
-   no unnecessary microservices or Kubernetes.

The blueprint explicitly states that the district API does **not**
perform the normal inference request inline; the edge computes and syncs
the result, while the district API primarily serves reviewer workflows
and synchronization.

For the one-day implementation, preserve that architecture where
feasible. If the existing repository already has a different
implementation, create a thin compatibility adapter rather than
redesigning the system.

Do not introduce new infrastructure merely to increase technology count.

------------------------------------------------------------------------

# 3. ONE-DAY SCOPE

## P0 --- MUST WORK

### Backend

-   Express application starts reliably.
-   Health endpoint works.
-   Image upload works.
-   Case UUID is generated.
-   Case metadata is persisted.
-   Inference adapter is callable.
-   Structured prediction result is stored.
-   Grad-CAM/evidence artifact can be attached.
-   Report can be generated or served.
-   Reviewer can retrieve a case.
-   Reviewer can submit a review decision.
-   Errors return structured responses.
-   Demo fixtures work without live external services.

### Frontend

-   Application shell.
-   Image upload/capture entry.
-   Processing state.
-   Quality result.
-   DR grade.
-   Confidence.
-   Referable status.
-   Explanation/Grad-CAM view.
-   Report action.
-   Reviewer view.
-   Human decision workflow.
-   Error/retry state.
-   API health state.

### Integration

-   Frontend ↔ backend contract.
-   Backend ↔ inference adapter contract.
-   Backend ↔ persistence.
-   Backend ↔ explanation artifact.
-   Backend ↔ report.
-   End-to-end golden fixture.

------------------------------------------------------------------------

# 4. EXPLICITLY OUT OF SCOPE FOR ENGINEER 2

Do NOT spend the one-day critical path on:

-   model retraining,
-   model architecture changes,
-   dataset changes,
-   threshold tuning,
-   Messidor-2 evaluation,
-   lesion-model training,
-   vessel segmentation,
-   full anatomical segmentation,
-   advanced calibration research,
-   Kubernetes,
-   microservices,
-   blockchain,
-   vector databases,
-   LLM features,
-   real-time cloud dependency,
-   unnecessary state-management frameworks,
-   elaborate design systems,
-   complex analytics,
-   mobile apps,
-   payment/subscription systems,
-   production multi-region infrastructure.

If a requested feature does not directly improve the screening → review
→ report path, defer it.

------------------------------------------------------------------------

# 5. ENGINEER 2 OWNERSHIP BOUNDARY

## Engineer 1 owns

``` text
Model
Preprocessing
Quality algorithm
MATLAB inference
Model validation
Grad-CAM generation
Threshold/calibration decisions
ML metrics
```

## Engineer 2 owns

``` text
API
Database
Filesystem/object handling
Case lifecycle
Frontend
Reviewer workflow
Report orchestration
Inference adapter
Integration
Error handling
Security baseline
Testing
Demo
```

## Shared

``` text
Interface contracts
E2E testing
Deployment
Final demo
Performance instrumentation
```

If an ML result is unavailable, **mock the contract and continue**.

Never silently change the ML contract.

------------------------------------------------------------------------

# 6. NON-NEGOTIABLE ENGINEERING RULES

## Rule 1 --- Contract first

Before integrating, define the JSON contract.

## Rule 2 --- No direct database access from React

Frontend → API → Service → Repository → Database.

## Rule 3 --- No model logic in React

React renders results. It does not calculate clinical predictions.

## Rule 4 --- No clinical decisions invented in the UI

The backend/inference layer provides the prediction and decision fields.

## Rule 5 --- Human review remains explicit

AI output is screening/triage evidence, not autonomous diagnosis.

## Rule 6 --- Every case gets a stable UUID

The UUID is the primary correlation key across:

-   image,
-   prediction,
-   report,
-   review,
-   audit,
-   sync.

## Rule 7 --- Never log raw patient images or sensitive clinical payloads unnecessarily.

## Rule 8 --- Fail closed

If inference fails:

``` text
Inference unavailable
        ↓
Case retained
        ↓
Human/manual review path
```

Never fabricate a prediction.

## Rule 9 --- Deterministic demo path

The demo must work even when:

-   MATLAB is unavailable,
-   network is unavailable,
-   district API is unavailable.

Use an explicit mock adapter only where required.

## Rule 10 --- No silent behavior

Every failure should produce:

-   user-visible state,
-   structured backend error,
-   useful server log,
-   recoverable state where possible.

------------------------------------------------------------------------

# 7. RECOMMENDED REPOSITORY STRUCTURE

Use the existing repository structure if one already exists.

Otherwise:

``` text
retinaguard/
│
├── backend/
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   │
│   │   ├── routes/
│   │   │   ├── health.routes.js
│   │   │   ├── cases.routes.js
│   │   │   ├── review.routes.js
│   │   │   ├── reports.routes.js
│   │   │   └── sync.routes.js
│   │   │
│   │   ├── controllers/
│   │   │   ├── case.controller.js
│   │   │   ├── review.controller.js
│   │   │   └── report.controller.js
│   │   │
│   │   ├── services/
│   │   │   ├── case.service.js
│   │   │   ├── inference.service.js
│   │   │   ├── review.service.js
│   │   │   ├── report.service.js
│   │   │   └── sync.service.js
│   │   │
│   │   ├── adapters/
│   │   │   ├── inference.adapter.js
│   │   │   ├── matlab.adapter.js
│   │   │   └── mock-inference.adapter.js
│   │   │
│   │   ├── repositories/
│   │   │   ├── case.repository.js
│   │   │   ├── review.repository.js
│   │   │   └── audit.repository.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── error.middleware.js
│   │   │   ├── validation.middleware.js
│   │   │   └── request-id.middleware.js
│   │   │
│   │   └── config/
│   │       └── index.js
│   │
│   ├── storage/
│   │   ├── images/
│   │   ├── explanations/
│   │   └── reports/
│   │
│   └── tests/
│
├── frontend/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── pages/
│       ├── routes/
│       ├── services/
│       ├── hooks/
│       ├── lib/
│       └── types/
│
├── contracts/
│   ├── case.schema.json
│   ├── prediction.schema.json
│   ├── review.schema.json
│   └── report.schema.json
│
├── fixtures/
│   ├── grade-0.json
│   ├── grade-2.json
│   ├── grade-4.json
│   └── quality-failure.json
│
├── docs/
└── README.md
```

Do not create this structure mechanically if the repository already has
a clean equivalent.

------------------------------------------------------------------------

# 8. CORE DOMAIN MODEL

Use one canonical Case object.

Conceptually:

``` json
{
  "case_uuid": "uuid",
  "schema_version": "1.0",
  "site_id": "SITE-001",
  "device_id": "CAM-001",
  "created_at": "ISO-8601",
  "status": "PROCESSING",
  "image": {
    "original_path": "...",
    "sha256": "...",
    "mime_type": "image/jpeg",
    "width": 4288,
    "height": 2848
  },
  "quality": {
    "grade": "A",
    "usable": true,
    "score": 0.94,
    "reason": null
  },
  "prediction": {
    "grade": 2,
    "label": "Moderate NPDR",
    "confidence": 0.87,
    "referable": true
  },
  "probabilities": {
    "0": 0.03,
    "1": 0.07,
    "2": 0.87,
    "3": 0.02,
    "4": 0.01
  },
  "explanation": {
    "gradcam_path": "...",
    "available": true
  },
  "report": {
    "json_path": "...",
    "pdf_path": "..."
  },
  "review": {
    "status": "PENDING",
    "reviewer_id": null,
    "decision": null
  },
  "model": {
    "model_version": "resnet18-v1",
    "model_hash": "...",
    "preprocessing_version": "v1"
  }
}
```

The exact schema must be agreed with Engineer 1 before integration.

------------------------------------------------------------------------

# 9. CASE STATE MACHINE

Implement an explicit state machine.

``` text
CREATED
   ↓
IMAGE_STORED
   ↓
PROCESSING
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

Possible failure state:

``` text
PROCESSING
    ↓
PROCESSING_FAILED
    ↓
MANUAL_REVIEW
```

Do not represent state only through arbitrary frontend booleans.

------------------------------------------------------------------------

# 10. API CONTRACT

Use `/api/v1`.

## Health

``` http
GET /healthz
```

Response:

``` json
{
  "status": "ok",
  "service": "retinaguard-api",
  "inference": "ready"
}
```

------------------------------------------------------------------------

## Create/screen case

``` http
POST /api/v1/cases
Content-Type: multipart/form-data
```

Input:

``` text
image=<fundus image>
site_id=<optional>
device_id=<optional>
```

Response:

``` json
{
  "case_uuid": "uuid",
  "status": "PROCESSING"
}
```

Do not block the frontend on an unnecessarily long request if inference
is slow. For the one-day build, synchronous inference is acceptable if
measured latency is safe; otherwise use a job state.

------------------------------------------------------------------------

# 11. GET CASE

``` http
GET /api/v1/case/{case_uuid}
```

Return:

``` json
{
  "case_uuid": "...",
  "status": "AI_COMPLETED",
  "quality": {},
  "prediction": {},
  "probabilities": {},
  "explanation": {},
  "report": {},
  "review": {}
}
```

------------------------------------------------------------------------

# 12. REVIEW QUEUE

``` http
GET /api/v1/queue
```

Support at minimum:

``` text
priority
status
date
site
```

Order cases using the triage information supplied by the inference
contract.

Do not invent medical urgency logic in the frontend.

------------------------------------------------------------------------

# 13. REVIEW DECISION

``` http
POST /api/v1/case/{case_uuid}/review
```

Payload:

``` json
{
  "decision_uuid": "uuid",
  "decision": "CONFIRM",
  "comment": "Human review completed",
  "reviewer_id": "REV-001"
}
```

Possible decisions:

``` text
CONFIRM
OVERRIDE
CANNOT_ASSESS
ESCALATE
```

The exact allowed enum must be agreed with the project contract.

Make review submission idempotent.

------------------------------------------------------------------------

# 14. REPORT ENDPOINT

``` http
GET /api/v1/report/{case_uuid}
```

Support:

``` text
application/json
application/pdf
```

The report must include:

-   case identifier,
-   timestamp,
-   image,
-   quality result,
-   DR grade,
-   confidence,
-   referable status,
-   probability distribution,
-   explanation artifact,
-   model version,
-   preprocessing version,
-   human-review status,
-   limitations/disclaimer.

Never present the AI result as an autonomous diagnosis.

------------------------------------------------------------------------

# 15. MODEL ENDPOINT

``` http
GET /api/v1/model
```

Return:

``` json
{
  "model_version": "resnet18-v1",
  "model_hash": "...",
  "preprocessing_version": "v1",
  "deployment_status": "ACTIVE"
}
```

This is essential for auditability.

------------------------------------------------------------------------

# 16. SYNC ENDPOINT

If district sync is in scope:

``` http
POST /api/v1/sync/{site_id}
```

Requirements:

-   idempotent,
-   case UUID based,
-   payload-version aware,
-   safe to retry,
-   no duplicate case creation.

Do not build a complicated distributed system for the one-day demo.

A simple outbox table/queue is sufficient.

------------------------------------------------------------------------

# 17. IMAGE STORAGE

Do not put large fundus images directly into the relational database
unless the existing architecture explicitly requires it.

Use:

``` text
filesystem/object storage
```

and store metadata:

``` text
case_uuid
sha256
path/object key
mime type
dimensions
created_at
```

The blueprint's intended architecture uses filesystem storage at the
edge and S3-compatible object storage at the district node.

------------------------------------------------------------------------

# 18. OFFLINE-FIRST BEHAVIOR

The screening workflow must not depend on internet availability.

At the edge:

``` text
Create case
   ↓
Persist locally
   ↓
Run inference locally
   ↓
Persist result
   ↓
Generate report
   ↓
Queue sync
```

If network is unavailable:

``` text
SYNC_PENDING
```

When connectivity returns:

``` text
SYNC_PENDING
      ↓
SYNCING
      ↓
SERVER_ACK
      ↓
SYNCED
```

Never delete the local record merely because synchronization fails.

Retry safely.

------------------------------------------------------------------------

# 19. FRONTEND INFORMATION ARCHITECTURE

The frontend should have four primary surfaces.

## Screen 1 --- Screening

Purpose:

``` text
Upload/capture → process → show result
```

Elements:

-   image upload,
-   capture/import area,
-   image preview,
-   process button,
-   processing state,
-   quality state,
-   result summary.

------------------------------------------------------------------------

## Screen 2 --- Result

Show:

``` text
DR Grade
Confidence
Referable
Quality
Probability distribution
Explanation
Report
```

Example:

``` text
Moderate NPDR
Grade 2

Confidence
87%

Referable
YES

Quality
A — Usable
```

Avoid decorative charts that obscure the clinical information.

------------------------------------------------------------------------

## Screen 3 --- Reviewer Queue

Show:

``` text
Priority
Case ID
Date/time
AI grade
Confidence
Referable
Review status
```

A reviewer should immediately understand:

``` text
What case is this?
Why is it here?
What does AI say?
What evidence exists?
What decision remains?
```

------------------------------------------------------------------------

## Screen 4 --- Case Review

Layout:

``` text
┌──────────────────────────────────────┐
│ Case information                     │
├──────────────────┬───────────────────┤
│ Original image   │ AI explanation    │
│                  │                   │
│                  │ Grad-CAM          │
├──────────────────┴───────────────────┤
│ AI result                            │
│ Grade / confidence / referral        │
├──────────────────────────────────────┤
│ Human review                         │
│ [Confirm] [Override] [Escalate]      │
└──────────────────────────────────────┘
```

------------------------------------------------------------------------

# 20. UX PRINCIPLES

The technician is not the clinician.

Therefore quality feedback must be actionable.

Bad:

``` text
Quality score: 0.37
```

Better:

``` text
Image not usable.
Reason: image appears blurry.
Please recapture.
```

The reviewer needs evidence, not decoration.

Bad:

``` text
AI confidence 87%
```

alone.

Better:

``` text
Predicted Grade: 2 — Moderate NPDR
Referable: Yes
Confidence: 87%
Explanation: Grad-CAM available
Human review required
```

------------------------------------------------------------------------

# 21. EXPLANATION UI

When Grad-CAM exists:

``` text
Original
   +
Grad-CAM overlay
```

Allow:

``` text
Original
Overlay
Side-by-side
```

Do not describe the heatmap as proof of a specific lesion unless the ML
team has independently validated that interpretation.

Use wording such as:

> AI attention/evidence visualization

rather than:

> This heatmap proves the lesion.

------------------------------------------------------------------------

# 22. CONFIDENCE UI

Never turn confidence into a clinical guarantee.

Avoid:

``` text
87% accurate
```

if the number is actually prediction confidence.

Use:

``` text
Model confidence: 87%
```

and keep the distinction between:

-   confidence,
-   sensitivity,
-   specificity,
-   validation performance.

These are not interchangeable.

------------------------------------------------------------------------

# 23. QUALITY FAILURE UX

If:

``` json
{
  "usable": false
}
```

the UI must NOT display:

``` text
Grade 0
```

or any inferred DR grade.

Display:

``` text
Cannot assess image

Reason:
Image quality is insufficient.

Recommended action:
Recapture image.

AI grading was not performed.
```

This is a safety requirement, not merely UX polish.

------------------------------------------------------------------------

# 24. INFERENCE ADAPTER

Do not couple Express directly to MATLAB internals.

Use:

``` text
InferenceService
      ↓
InferenceAdapter
      ↓
MATLAB / local inference
```

Interface:

``` javascript
async function analyzeCase(input) {
    return {
        quality,
        prediction,
        probabilities,
        explanation,
        model
    };
}
```

Implement:

``` text
MatlabInferenceAdapter
MockInferenceAdapter
```

The mock exists only to unblock frontend/API development and
deterministic demos.

Never silently use mock inference in a real deployment.

------------------------------------------------------------------------

# 25. MATLAB INTEGRATION STRATEGY

Engineer 1 owns MATLAB.

Engineer 2 owns the integration boundary.

Preferred boundary:

``` text
Backend
   ↓
Adapter
   ↓
MATLAB executable/function
   ↓
Structured JSON/result artifact
   ↓
Backend
```

Do not make the Express request depend on MATLAB's interactive desktop.

Do not start a fresh MATLAB session for every request if the deployment
architecture provides a persistent/compiled execution path.

If the real MATLAB integration is not ready:

``` text
ENVIRONMENT:
INFERENCE_PROVIDER=mock
```

must be explicit.

------------------------------------------------------------------------

# 26. REPORT GENERATION

Build the report from the canonical Case object.

Do not let the frontend construct the clinical report.

Backend:

``` text
Case
 ↓
ReportService
 ↓
JSON/PDF
```

Report sections:

1.  Case information
2.  Image
3.  Quality assessment
4.  AI assessment
5.  Probability distribution
6.  Explainability
7.  Human review
8.  Model metadata
9.  Limitations/disclaimer

------------------------------------------------------------------------

# 27. AUDIT LOGGING

Every important event should be auditable.

Minimum events:

``` text
CASE_CREATED
IMAGE_STORED
INFERENCE_STARTED
INFERENCE_COMPLETED
QUALITY_REJECTED
REPORT_GENERATED
REVIEW_STARTED
REVIEW_SUBMITTED
SYNC_STARTED
SYNC_COMPLETED
SYNC_FAILED
```

Record:

``` text
event_id
case_uuid
timestamp
actor
event_type
model_version
request_id
metadata
```

Never modify historical audit events.

------------------------------------------------------------------------

# 28. SECURITY BASELINE

At minimum:

-   validate MIME type,
-   validate image size,
-   reject unsupported formats,
-   sanitize filenames,
-   never trust client-provided paths,
-   prevent path traversal,
-   restrict CORS,
-   use environment variables for secrets,
-   do not commit secrets,
-   do not log raw images,
-   protect reviewer endpoints,
-   enforce role boundaries where authentication exists,
-   use HTTPS for networked deployment,
-   use secure token handling,
-   avoid exposing filesystem paths.

For the one-day build, implement the baseline without building an
elaborate identity platform.

------------------------------------------------------------------------

# 29. INPUT VALIDATION

Reject:

``` text
non-image files
corrupt images
oversized payloads
unsupported MIME types
empty uploads
invalid UUIDs
invalid review decisions
malformed JSON
```

Return consistent errors:

``` json
{
  "error": {
    "code": "INVALID_IMAGE",
    "message": "Uploaded file is not a supported fundus image.",
    "request_id": "..."
  }
}
```

Do not leak stack traces to the browser.

------------------------------------------------------------------------

# 30. ERROR TAXONOMY

Define clear categories:

``` text
VALIDATION_ERROR
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

Each should have:

``` text
HTTP status
machine-readable code
human-readable message
request ID
safe recovery suggestion
```

------------------------------------------------------------------------

# 31. OBSERVABILITY

Instrument timings:

``` text
upload_ms
decode_ms
quality_ms
preprocess_ms
inference_ms
explanation_ms
report_ms
db_ms
total_ms
```

This is important because the blueprint feeds measured pipeline timings
into the SimEvents workflow model.

Do not fabricate latency numbers.

Measure them.

------------------------------------------------------------------------

# 32. FRONTEND ERROR STATES

Every async operation needs:

``` text
idle
loading
success
error
retry
```

Example:

``` text
PROCESSING
   ↓
SUCCESS
```

or:

``` text
PROCESSING
   ↓
FAILED
   ↓
[Retry]
```

For offline sync:

``` text
Saved locally
Waiting for connection
```

rather than:

``` text
Error
```

when the actual case is safely persisted locally.

------------------------------------------------------------------------

# 33. FRONTEND STATE RULES

Keep state minimal.

Suggested:

``` text
auth state
current case
case list
review queue
UI state
network state
```

Do not introduce a heavy state-management library unless the repository
already uses one or the current architecture genuinely requires it.

Server data should remain server-derived.

Do not duplicate the entire database inside React state.

------------------------------------------------------------------------

# 34. API CLIENT

Centralize API calls:

``` text
services/api.ts
```

Example:

``` javascript
api.createCase(file)
api.getCase(caseUuid)
api.getQueue()
api.submitReview(caseUuid, payload)
api.getReport(caseUuid)
api.getHealth()
```

Do not scatter raw `fetch()` calls throughout components.

------------------------------------------------------------------------

# 35. TYPE SAFETY / SCHEMA SAFETY

Maintain shared contracts.

If TypeScript is available:

``` text
Case
Prediction
QualityResult
ReviewDecision
Report
ApiError
```

must be typed.

Use runtime validation at the backend boundary.

Never assume the frontend response is valid merely because TypeScript
says it is.

------------------------------------------------------------------------

# 36. ONE-DAY EXECUTION PLAN

## Hour 0--1 --- Contract Lock

Engineer 2:

-   inspect repository,
-   identify existing architecture,
-   define Case schema,
-   define Prediction schema,
-   define Review schema,
-   define endpoints,
-   create fixtures.

Engineer 1:

-   validate ONNX,
-   validate preprocessing,
-   confirm inference output.

**Integration checkpoint:** contracts frozen.

------------------------------------------------------------------------

## Hour 1--3 --- Backend Skeleton + Frontend Shell

Engineer 2:

``` text
Express
routes
controllers
services
repository
React shell
routing
API client
```

Do not polish UI yet.

------------------------------------------------------------------------

## Hour 3--5 --- Core Screening Flow

Engineer 2:

``` text
upload
case creation
storage
inference adapter
result retrieval
```

Engineer 1:

``` text
real inference adapter
MATLAB result contract
```

------------------------------------------------------------------------

## Hour 5--7 --- Result + Explainability

Engineer 2:

``` text
result page
probability distribution
Grad-CAM artifact handling
report endpoint
```

Engineer 1:

``` text
real Grad-CAM artifact
```

------------------------------------------------------------------------

## Hour 7--9 --- Reviewer Workflow

Engineer 2:

``` text
queue
case detail
review action
audit event
```

------------------------------------------------------------------------

## Hour 9--10 --- Offline + Failure Handling

Test:

``` text
network unavailable
inference unavailable
bad image
report failure
database failure
```

------------------------------------------------------------------------

## Hour 10--12 --- E2E + Demo Hardening

Run:

``` text
Grade 0 fixture
Grade 2 fixture
Grade 4 fixture
Bad-quality fixture
Inference failure fixture
```

Then:

``` text
upload
→ inference
→ result
→ explanation
→ report
→ review
→ audit
```

Do not add new features after this point unless they remove a release
blocker.

------------------------------------------------------------------------

# 37. DEMO MODE

Create a deterministic demo mode.

Example:

``` env
APP_MODE=demo
INFERENCE_PROVIDER=mock
```

The demo adapter must return fixed fixtures.

But the UI must visibly indicate demo/mock mode to the development team.

Never hide mock inference behind a production-looking state.

------------------------------------------------------------------------

# 38. GOLDEN E2E TEST

Create one golden case:

``` text
fixtures/golden/
```

Expected:

``` text
image accepted
quality available
grade available
confidence available
referable available
Grad-CAM available
report generated
review submitted
audit events created
```

The entire application must pass this case before demo freeze.

------------------------------------------------------------------------

# 39. TEST MATRIX

  -----------------------------------------------------------------------
  Test                                Expected
  ----------------------------------- -----------------------------------
  Valid fundus image                  Case completes

  Missing image                       400 validation error

  Corrupt image                       Decode error

  Unsupported MIME                    Rejected

  Oversized image                     Rejected

  Quality failure                     No DR grade

  Grade 0 fixture                     Non-referable result

  Grade 2 fixture                     Referable result

  Grade 4 fixture                     Referable/urgent path according to
                                      contract

  Inference unavailable               Manual/human fallback

  Grad-CAM unavailable                Prediction remains auditable;
                                      explanation marked unavailable

  Report failure                      Case preserved

  Network unavailable                 Local state preserved

  Sync retry                          No duplicate case

  Duplicate review                    Idempotent

  Invalid review decision             Validation error
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 40. PERFORMANCE

Do not optimize prematurely.

Measure first.

At minimum:

``` text
API latency
upload latency
inference latency
report generation latency
frontend render latency
```

Avoid:

-   repeated model initialization,
-   repeated image decoding,
-   unnecessary API polling,
-   giant frontend bundles,
-   sending full-resolution images repeatedly.

------------------------------------------------------------------------

# 41. ACCESSIBILITY / USABILITY

Minimum requirements:

-   keyboard-accessible controls,
-   readable status text,
-   visible focus states,
-   sufficient contrast,
-   meaningful button labels,
-   no color-only meaning,
-   clear loading state,
-   clear error state.

For example:

Bad:

``` text
red dot = failed
```

Better:

``` text
Image quality: Not usable
Reason: excessive blur
```

------------------------------------------------------------------------

# 42. GIT STRATEGY

Use small commits.

Suggested:

``` text
feat(api): add case contracts
feat(api): add screening endpoint
feat(api): add inference adapter
feat(ui): add screening workflow
feat(ui): add result page
feat(ui): add reviewer queue
feat(report): add report endpoint
feat(sync): add offline outbox
test(e2e): add golden screening fixture
fix(api): handle inference failure safely
```

Do not make one giant commit.

------------------------------------------------------------------------

# 43. BLOCKER PROTOCOL

When blocked:

## Blocker A --- Frontend-only

Solve it.

## Blocker B --- Missing API

Create/use the contract and continue.

## Blocker C --- ML unavailable

Use the explicit mock adapter.

## Blocker D --- MATLAB unavailable

Keep the MATLAB adapter boundary and validate using the agreed fixture.

## Blocker E --- Requirement ambiguity

Do not silently invent behavior.

Document the assumption and choose the smallest reversible
implementation.

------------------------------------------------------------------------

# 44. DEFINITION OF DONE

Engineer 2 is NOT done when the page renders.

A feature is done only when:

``` text
Implementation
+
API contract
+
Validation
+
Error handling
+
Persistence
+
Integration
+
Test
+
Demo path
```

are complete.

------------------------------------------------------------------------

# 45. FINAL ACCEPTANCE CHECKLIST

## Backend

-   [ ] Server starts
-   [ ] `/healthz` works
-   [ ] Case creation works
-   [ ] Image validation works
-   [ ] Case persistence works
-   [ ] Inference adapter works
-   [ ] Prediction stored
-   [ ] Explanation stored
-   [ ] Report endpoint works
-   [ ] Review endpoint works
-   [ ] Errors are structured
-   [ ] Request IDs exist
-   [ ] Audit events exist

## Frontend

-   [ ] Upload works
-   [ ] Processing state works
-   [ ] Quality result visible
-   [ ] DR grade visible
-   [ ] Confidence visible
-   [ ] Referable state visible
-   [ ] Explanation visible
-   [ ] Report action works
-   [ ] Queue works
-   [ ] Case review works
-   [ ] Errors visible
-   [ ] Retry works

## Integration

-   [ ] Frontend → API
-   [ ] API → inference
-   [ ] inference → result
-   [ ] result → database
-   [ ] explanation → UI
-   [ ] report → UI
-   [ ] review → audit
-   [ ] offline state works
-   [ ] deterministic demo works

## Safety

-   [ ] Quality failure does not produce a DR grade
-   [ ] AI uncertainty is visible
-   [ ] Human review is explicit
-   [ ] No autonomous diagnosis wording
-   [ ] No unsupported medical claims
-   [ ] Mock mode is explicit
-   [ ] Failures do not fabricate results

------------------------------------------------------------------------

# 46. FINAL DEMO FLOW

The final demo should be executable in this exact order:

``` text
1. Open RetinaGuard
        ↓
2. Upload fundus image
        ↓
3. Case ID generated
        ↓
4. Processing indicator
        ↓
5. Quality assessment
        ↓
6. AI grade 0–4
        ↓
7. Confidence
        ↓
8. Referable / non-referable
        ↓
9. Grad-CAM/evidence
        ↓
10. Generate report
        ↓
11. Open reviewer queue
        ↓
12. Open case
        ↓
13. Review evidence
        ↓
14. Confirm / Override / Escalate
        ↓
15. Audit event recorded
        ↓
16. Case marked reviewed
```

This sequence should work from a clean application start.

------------------------------------------------------------------------

# 47. FINAL ARCHITECTURE TARGET

The one-day system should look like:

``` text
                 ┌─────────────────────┐
                 │    React Frontend   │
                 │                     │
                 │ Screening           │
                 │ Results             │
                 │ Explainability      │
                 │ Reviewer Queue      │
                 │ Review              │
                 └──────────┬──────────┘
                            │ HTTPS/HTTP
                            ▼
                 ┌─────────────────────┐
                 │    Express API      │
                 │                     │
                 │ Routes              │
                 │ Controllers         │
                 │ Services            │
                 │ Validation          │
                 │ Audit               │
                 └───────┬─────┬───────┘
                         │     │
              ┌──────────┘     └──────────┐
              ▼                           ▼
     ┌────────────────┐          ┌─────────────────┐
     │ Case/Repository│          │ InferenceAdapter│
     │ SQLite/DB      │          │                 │
     └───────┬────────┘          │ MATLAB / Mock   │
             │                   └────────┬────────┘
             ▼                            │
     ┌────────────────┐                   ▼
     │ Filesystem /   │          ┌─────────────────┐
     │ Object Storage │          │ AI Result       │
     │ images/reports │          │ Grade/Conf/etc. │
     └────────────────┘          └─────────────────┘
```

------------------------------------------------------------------------

# 48. CRITICAL ARCHITECTURAL PRINCIPLE

Do not let the backend become an ML system.

Its job is orchestration:

``` text
receive
→ validate
→ persist
→ invoke
→ validate result
→ persist
→ expose
→ audit
```

The frontend's job is communication:

``` text
input
→ status
→ evidence
→ decision workflow
```

The AI system's job is inference:

``` text
image
→ quality
→ preprocessing
→ model
→ explanation
```

Keeping these boundaries clean is more valuable than adding another
technology.

------------------------------------------------------------------------

# 49. WHAT SUCCESS LOOKS LIKE AFTER ONE DAY

A successful Engineer 2 implementation means a judge can see:

``` text
Fundus image
      ↓
RetinaGuard
      ↓
AI result
      ↓
Explanation
      ↓
Clinical-style report
      ↓
Reviewer decision
      ↓
Auditable case
```

without needing to understand the internal implementation.

The application should feel like **one coherent screening product**, not
a collection of disconnected technical demos.

------------------------------------------------------------------------

# 50. ANTI-GRAVITY EXECUTION INSTRUCTION

You are operating as an autonomous senior software engineer inside the
RetinaGuard repository.

Before changing code:

1.  inspect the repository,
2.  identify existing frontend/backend architecture,
3.  identify existing contracts,
4.  identify existing MATLAB/inference integration,
5.  identify reusable components,
6.  identify current blockers.

Then implement the smallest architecture that satisfies this
specification.

## Do not:

-   rewrite working code without reason,
-   introduce unnecessary dependencies,
-   change ML behavior,
-   modify model preprocessing,
-   invent clinical logic,
-   invent API behavior silently,
-   create fake production integrations,
-   hide failures,
-   claim features are complete when they are mocked,
-   expand scope because a feature looks interesting.

## Do:

-   reuse existing code,
-   preserve interfaces,
-   create explicit adapters,
-   use typed/validated contracts,
-   build incrementally,
-   test after each integration,
-   keep the demo deterministic,
-   document assumptions,
-   surface blockers immediately,
-   prioritize P0 path,
-   measure timing,
-   maintain safe failure behavior.

When an integration is unavailable, create the interface and a clearly
named mock implementation so development can continue.

When a requirement is ambiguous, prefer the documented project blueprint
and the smallest reversible choice.

When a change could affect:

-   model artifact,
-   preprocessing,
-   safety behavior,
-   offline behavior,
-   data schema,
-   authentication,
-   clinical claims,

stop and flag it for Engineer 1/technical-owner review rather than
silently changing it.

------------------------------------------------------------------------

# 51. FINAL DELIVERABLES

At the end of execution, produce:

``` text
1. Working backend
2. Working frontend
3. API contract
4. Case schema
5. Review schema
6. Inference adapter
7. Mock inference adapter
8. Report generation
9. Audit logging
10. Offline/local persistence path
11. Golden E2E fixture
12. Test results
13. README
14. Environment configuration example
15. Known limitations
16. Integration status with MATLAB
```

Also produce a short implementation report:

``` text
Implemented
Reused
Changed
Mocked
Blocked
Tested
Not completed
```

Never label a mocked or unverified integration as production-ready.

------------------------------------------------------------------------

# 52. FINAL PRINCIPLE

The goal is not to build the largest application.

The goal is to build the smallest **credible, deterministic, safe,
explainable, integrated screening application** around the validated
RetinaGuard model.

The critical path is:

``` text
CASE
 ↓
IMAGE
 ↓
INFERENCE
 ↓
RESULT
 ↓
EXPLANATION
 ↓
REPORT
 ↓
HUMAN REVIEW
 ↓
AUDIT
```

Everything else is secondary.
