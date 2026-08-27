# API.md

Full interactive documentation is generated from JSDoc `@openapi` blocks in
`src/modules/**/*.routes.js` and served at **`GET /docs`** (Swagger UI) and
**`GET /openapi.json`** (raw spec) when the server is running. This document is
a narrative companion, not a duplicate of the schema.

All endpoints below are relative to the API root (`http://localhost:4000` by
default). All authenticated endpoints require `Authorization: Bearer <accessToken>`.

## Conventions

- **Errors** always have the shape `{ "error": { "code", "message", "details?" } }`.
  See `src/utils/errors.js` for the full code list (`VALIDATION_ERROR`,
  `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `CLINICAL_SAFETY_VIOLATION`,
  `MATLAB_ERROR`, `SYNC_ERROR`, …).
- **Pagination**: list endpoints accept `page` (default 1) and `limit` (default
  20, max 100) and return `{ items, pagination: { page, limit, total, totalPages, hasNext, hasPrev } }`.
- **Idempotency**: `POST`/`PATCH` endpoints that create clinical records accept an
  optional `Idempotency-Key` header. A retried request with the same key and
  body replays the original response instead of re-executing the side effect —
  important on a flaky rural connection. See `src/middleware/idempotency.js`.
- **Optimistic concurrency**: `patients` and `consultations` carry a `version`
  column. Updates fail with `409 CONFLICT` if the row changed since it was read.

## Auth

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | Returns `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh` | public (valid refresh token) | Rotates the refresh token |
| POST | `/auth/logout` | authenticated | Revokes the supplied refresh token |
| GET  | `/auth/me` | authenticated | Current user |
| POST | `/auth/users` | admin | Create a technician/reviewer/admin/district account |

Access tokens are short-lived (`JWT_ACCESS_TTL`, default 15m); refresh tokens
are long-lived (`JWT_REFRESH_TTL`, default 7d) and stored server-side only as a
SHA-256 hash, so a stolen database dump does not yield usable tokens.

## Patients

| Method | Path | Role |
|---|---|---|
| POST | `/patients` | technician, admin |
| GET  | `/patients` | any authenticated |
| GET  | `/patients/:id` | any authenticated |
| PUT  | `/patients/:id` | technician, admin |

`POST /patients` returns a `PatientResponse` object containing the `patient` and `possibleDuplicates` — near-matches on phone or
(name + age) found *before* the new record is created, surfaced so the
technician can catch a duplicate registration rather than silently blocking it.

## Consultations (cases)

| Method | Path | Role |
|---|---|---|
| POST | `/consultations` | technician, admin |
| GET  | `/consultations` | any authenticated |
| GET  | `/consultations/:id` | any authenticated |
| PATCH | `/consultations/:id` | technician, reviewer, admin |

`identityConfirmed: true` is **required** to create a consultation — see the
clinical safety note in `consultationService.create`. Status transitions are a
strict state machine (`consultationService.STATUS_TRANSITIONS`); illegal
transitions return `409`.

## Images

| Method | Path | Role |
|---|---|---|
| POST | `/images/upload` | technician, admin |
| GET  | `/images/:id` | any authenticated |
| DELETE | `/images/:id` | technician, admin |
| GET  | `/images/by-consultation/:consultationId` | any authenticated |

`POST /images/upload` is `multipart/form-data` with fields `image`, `consultationId`,
`laterality`. It **synchronously** runs the MATLAB quality gate and returns
actionable retake guidance immediately (Blueprint sequence diagram, segment 3).
Exceeding `MAX_RECAPTURE_ATTEMPTS` for one eye returns
`409 CLINICAL_SAFETY_VIOLATION` — the technician must escalate to human
review, not keep retaking the photo.

## Analysis

| Method | Path | Role |
|---|---|---|
| POST | `/analysis/run` | technician, admin |
| GET  | `/analysis/:id` | any authenticated |
| GET  | `/analysis/:id/explainability` | any authenticated |

`POST /analysis/run` executes the full pipeline (preprocess → anatomy → DR
grading → lesion evidence → Grad-CAM). The response always carries
`isDiagnosis: false` and `humanReviewRequired: true`. A low-confidence,
borderline, or evidence-disagreement case is persisted with
`analysis.status = "abstained"` — the frontend must render the abstention
message, never a blank or default grade.

## Reviewer

| Method | Path | Role |
|---|---|---|
| GET | `/review/queue` | reviewer, admin |
| GET | `/review/:id` | reviewer, admin |
| POST | `/review/:id/decision` | reviewer, admin |

The queue (`v_review_queue` SQL view) is ordered by `triage_priority` (P0
first) then by case age within a tier. `POST /review/:id/decision` is
one-shot per consultation — a second call returns `409 CONFLICT`. Reviewer
notes and override reasons are linted against the clinical-safety vocabulary
(`clinicalSafetyService.lint`) before they are persisted.

## Reports

| Method | Path | Role |
|---|---|---|
| POST | `/reports/:consultationId/generate` | technician, reviewer, admin |
| GET  | `/reports/:consultationId/json` | any authenticated |
| GET  | `/reports/:consultationId/pdf` | any authenticated |
| GET  | `/reports/verify/:token` | public |

The JSON endpoint `/reports/:consultationId/json` returns `{ report, meta }` where `report` matches the `ScreeningReport` interface. The `/generate` endpoint returns `ReportResponse` (the database record).
`/reports/verify/:token` is intentionally unauthenticated and returns no PHI —
it exists so a printed report's QR code can be checked against the district
record without exposing patient data to whoever scans it.

## Sync

| Method | Path | Role |
|---|---|---|
| POST | `/sync/push` | technician, admin, district |
| POST | `/sync/pull` | technician, admin, district |
| GET  | `/sync/status` | any authenticated |
| GET  | `/sync/conflicts` | admin |

See `docs/SYNC_ARCHITECTURE.md` for the full push/pull/conflict model.

## Audit

| Method | Path | Role |
|---|---|---|
| GET | `/audit/:caseId` | reviewer, admin |
| GET | `/audit/verify` | admin |

`/audit/verify` walks the hash chain and reports the first broken link, if
any — see `auditRepository.verifyChain`.

## Admin

| Method | Path | Role |
|---|---|---|
| GET | `/admin/dashboard` | admin |
| GET | `/admin/users` | admin |
| POST | `/admin/users/:id/deactivate` | admin |
| GET | `/admin/capabilities` | admin |

## Health

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | none — liveness |
| GET | `/health/ready` | none — readiness (edge DB only; district optional by design) |
| GET | `/health/matlab` | none — adapter status (`mock` or `cli`) |

## WebSocket (Socket.IO)

Connect to `path: /ws` with `auth: { token: <accessToken> }`. Reviewers and
admins are joined to a `reviewers` room and receive:

`case_created`, `case_updated`, `review_completed`, `sync_finished`, `sync_conflict`

Each event is wrapped as `{ event, payload, at }`. See `docs/interfaces.ts` →
`WsEnvelope`.
