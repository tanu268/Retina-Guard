# RetinaGuard Backend

Offline-first, explainable-AI backend for diabetic retinopathy screening in rural India.
Built for **Smart India Hackathon 2026 · Problem Statement 26038** (MathWorks · Clean & Green Technology) by **Team Glitch2Sight**.

> ⚠️ **Clinical scope.** RetinaGuard performs AI-assisted **screening and triage**, not diagnosis.
> Every result is reviewed by a qualified human before a referral decision is issued. See
> [`docs/MATLAB_INTEGRATION.md`](docs/MATLAB_INTEGRATION.md) and `src/services/clinicalSafetyService.js`
> for the enforced safety rules.

## Why this architecture

The edge node (a laptop or NUC at a rural PHC) must keep screening patients with **zero network
connectivity**. SQLite is the system of record at the edge; PostgreSQL exists only on the district
server and is populated by asynchronous, idempotent, store-and-forward sync. See
[`docs/SYNC_ARCHITECTURE.md`](docs/SYNC_ARCHITECTURE.md).

## Quick start

```bash
git clone <this-repo> retinaguard-backend
cd retinaguard-backend
cp .env.example .env
npm install
npm run migrate          # creates ./data/retinaguard.db (SQLite, edge)
npm run seed              # creates demo technician / reviewer / admin accounts
npm run dev                # http://localhost:4000 — API docs at /docs
```

Demo credentials created by `npm run seed`:

| Role       | Username      | Password           |
|------------|---------------|---------------------|
| Technician | `tanu.tech`   | `Tech#Rural2026`     |
| Reviewer   | `reviewer.doc`| `Review#Doc2026`     |
| Admin      | `admin`       | `AdminRG#2026Secure` |

**Change these before any real deployment.**

## Running with Docker

```bash
cp .env.example .env
docker compose -f docker/docker-compose.yml up --build
```

This starts the edge API (SQLite, bind-mounted to `./data`) and, if `DISTRICT_SYNC_ENABLED=true`
in `.env`, a PostgreSQL district node alongside it.

## Tests

```bash
npm test                 # unit + integration, in-memory SQLite, MATLAB mock adapter
npm run test:coverage    # coverage report (target: 85%+ lines/functions, see package.json)
```

No live MATLAB installation, PostgreSQL server, or network access is required to run the test
suite — see [`docs/MATLAB_INTEGRATION.md`](docs/MATLAB_INTEGRATION.md) for how the mock adapter
keeps this true while remaining swappable for the real pipeline.

## Project layout

```
src/
  modules/        feature-sliced: auth, patients, consultations, images, analysis,
                   reviewer, reports, sync, audit, admin, health
                   (each: *.routes.js → *.controller.js → *.schema.js)
  services/       business rules (clinical safety, sync manager, PDF, auth, ...)
  repositories/   data access (BaseRepository + one repo per table)
  matlab/         contracts.js (frozen shapes) + mockAdapter.js + cliAdapter.js + *.m stubs
  database/       SQL migrations (sqlite/, postgres/), migration runner, seed script
  middleware/     auth, RBAC, validation, rate limiting, uploads, idempotency, errors
  websocket/      Socket.IO reviewer notifications
  config/         environment loading + RBAC capability map
docs/             this file's siblings: API.md, DATABASE.md, MATLAB_INTEGRATION.md,
                   SYNC_ARCHITECTURE.md, interfaces.ts
tests/            unit/ (services, repositories, MATLAB contracts) + integration/ (HTTP, E2E)
docker/           Dockerfile + docker-compose.yml
swagger/          OpenAPI base definition (paths are attached via JSDoc in *.routes.js)
```

## Design decisions carried over from the SDLC blueprint

- **Clean Architecture / Repository pattern / DI** — routes never touch SQL; services never touch
  Express; everything is constructor-injected via `src/container.js`, so tests build a fresh
  in-memory container per suite with no shared state.
- **MATLAB is a swappable boundary** (`src/matlab/matlabService.js`). Every adapter response is
  validated against `src/matlab/contracts.js` before it is trusted. Flipping
  `MATLAB_ADAPTER=mock` → `cli` in `.env` changes zero HTTP response shapes.
- **Human review is mandatory**, enforced in `clinicalSafetyService.assertReviewRequired` and the
  `consultations` status machine (`consultationService.STATUS_TRANSITIONS`) — a case cannot reach
  `closed` without a recorded reviewer decision.
- **Abstention over guessing.** Low confidence, borderline referable probability, or a Grad-CAM /
  lesion-evidence disagreement all route to human review instead of publishing a grade
  (`clinicalSafetyService.evaluateAbstention`).
- **Offline-first sync** uses deterministic idempotency keys, exponential backoff with jitter, and
  an explicit `conflict` state — never silent last-writer-wins on clinical data
  (`src/services/syncManager.js`).
- **Audit trail is append-only and hash-chained** at the SQL layer (`SQLite` triggers block
  `UPDATE`/`DELETE`), not only in application code (`src/repositories/auditRepository.js`).

## What is intentionally NOT built

Per the SDLC blueprint's `DO NOT BUILD` list: no Kubernetes/microservices split, no blockchain, no
vector DB / LLM layer, no production auto-retraining pipeline. A single Express process with
SQLite + optional PostgreSQL sync is the correct scope for an SIH MVP/V1 deployment.

## Status of the MATLAB pipeline

The `.m` entry points under `src/matlab/scripts/` are **stubs** that intentionally raise
`NotImplemented` — the real model artefact is not frozen yet (Blueprint Phase 5). Until then, keep
`MATLAB_ADAPTER=mock` (the default). The mock adapter is deterministic (seeded from the image
SHA-256) so the demo and the test suite are both reproducible. See
[`docs/MATLAB_INTEGRATION.md`](docs/MATLAB_INTEGRATION.md) for the swap procedure.
