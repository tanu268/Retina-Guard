# RetinaGuard — Edge Frontend (v3)

Offline-first React frontend for diabetic retinopathy screening at rural
primary health centres. SIH 2026 · Problem Statement 26038 · Team Glitch to Sight.

This is a **modification** of the existing `retinaguard-edge` project, not a
rewrite: folder structure, backend, API routes, request/response field names,
authentication, and database schema are all unchanged. Every fix below is
frontend-only.

## Run it

```bash
npm install
cp .env.example .env   # edit VITE_API_BASE_URL if the backend isn't on :4000
npm run dev
```

Requires the backend running separately (`node src/server.js` in
`retinaguard-backend`, port 4000 by default).

```bash
npm run build      # tsc -b && vite build — verified clean, ~2s
npm run preview    # serve the production build locally
```

## What changed and why

The previous frontend guessed at several response envelopes and request field
names. Nine of those guesses were wrong, and two of them (`patient_id` instead
of `patientId`, and a missing `reviewerGradeCode`) meant the technician and
reviewer workflows returned HTTP 422 on every attempt. All nine are fixed in
`src/services/api.ts`, with the wrong assumption commented in place so the
history isn't lost.

Every fix was checked against the **live** running backend, not just read from
the docs — see the verification notes below.

### Fixed contract mismatches

| Area | Was | Now |
|---|---|---|
| `POST /consultations` | sent `patient_id` → 422 | sends `patientId` |
| `POST /review/:id/decision` | `{decision, notes}` → 422, no grade selector existed | full `reviewerGradeCode` + decision, grade selector added to the UI |
| `GET /review/queue` | read `res.queue` (doesn't exist) → always empty | reads `res.items` |
| `GET /auth/me` | returned envelope treated as user → `role` undefined after refresh | unwraps `{ user }` |
| `GET /reports/:id/json` | cast `{report, meta}` straight to the report → blank page | unwraps `.report` |
| `GET /analysis/:id` | `.analysis` only — no mandatory disclaimer | service re-attaches the disclaimer; a screening result is never rendered without it |
| `GET /images/*`, `/consultations/:id`, `/admin/users`, `/sync/conflicts` | mixed key names | all unwrapped in `services/api.ts` |
| SQLite booleans (`abstained`, `referable`, `is_active`, …) | compared with `=== true` → silently false for `1` | `isTrue()` helper in `lib/format.ts` used everywhere |
| Reviewer's fundus images | read `consultation.images` (key doesn't exist) → no evidence shown | fetched via `imageService.listByConsultation` |

## Backend issues found — not fixed here, out of scope for this ZIP

These are on the backend, which this brief says not to touch. Flagging them
because they'll surface eventually:

1. **`src/repositories/index.js` won't boot on a case-sensitive filesystem.**
   It requires `./refreshTokenRepository` and `./explainabilityRepository`,
   but the files are `RefreshTokenRepository.js` and
   `ExplainabilityRepository.js`. Works on Windows/macOS by accident; fails on
   Linux and in Docker. Two-line fix.
2. **`GET /consultations` has no `patientId` filter**, so a patient's full
   screening history can't be queried directly — `PatientDetail.tsx` works
   around this by pulling all consultations and filtering client-side, which
   won't scale past a small node.
3. **No route serves image binaries.** `file_path` and `artifact_path` are
   filesystem paths; nothing statically serves `/uploads`. This is why
   `RetinaViewer` draws a labelled schematic from measured coordinates instead
   of a photograph — see below.
4. `backend/package.json` still says `Team DrigShift`. Doesn't affect
   function, but worth fixing before submission for consistency.

## The RetinaViewer

Because no endpoint serves the actual fundus photograph, `RetinaViewer`
(`src/components/clinical/RetinaViewer.tsx`) draws the retina from the
coordinates the analysis pipeline actually returns: optic disc centre and
radius, foveal centre, the two-disc-diameter macular zone, vessel density and
tortuosity (used to seed a deterministic vessel tree), Grad-CAM regions with
intensity, and lesion bounding boxes by type. Every mark on screen traces to a
real number from the API — none of it is decorative.

It's labelled "Schematic rendering… Not a photograph" directly on the
component. If an image-serving route is added later, pass `imageUrl` and the
same overlays composite over the real photo with no other changes needed.

## Verification

Two checks were run before this was packaged, both against the live backend
on port 4000 with the seeded demo accounts:

- **`npx tsc -b --noEmit`** — zero errors.
- **`npm run build`** — succeeds, ~1.6s, with the admin charting bundle
  (Recharts, ~424 kB) split into its own chunk so a technician's device never
  downloads it.
- **A 33-request integration script** replaying the exact payloads
  `src/services/api.ts` sends — patient registration with duplicate
  detection, consultation creation, image upload with synchronous quality
  scoring, analysis run, explainability fetch, review queue, decision
  submission (including confirming the safety linter blocks prohibited
  language and rejects a missing grade), report generation, PDF download, and
  public verification. All 33 passed against the running backend.

This was not run through a browser renderer in this environment (headless
Chrome couldn't be downloaded under the sandbox's network policy), so a
manual click-through on your machine after `npm run dev` is still worth doing
before the demo.

## Structure

```
src/
  types/          corrected API contract (types/index.ts)
  lib/            http client, query hooks, clinical vocabulary, formatters
  services/       one function per endpoint, envelopes unwrapped here
  contexts/       auth + sync state
  components/
    ui/           primitives — Button, Card, Field, Tabs, etc.
    clinical/      RetinaViewer, indicators, result panels
    layout/        AppShell, route guards, error boundary
    landing/       hero illustration
  pages/
    landing/       4-section marketing page
    technician/    dashboard, registration, capture, analysis
    reviewer/      queue, workspace, (report is shared)
    admin/         overview, users, capacity, audit
    shared/        patients, cases, sync monitor, report
```

## Team

Glitch to Sight · Smart India Hackathon 2026 · Problem Statement 26038 (MathWorks)
