# RetinaGuard — Product Requirements Document

Smart India Hackathon 2026 · Problem Statement 26038 · Organisation: **MathWorks**

**Status:** Draft for team review — not locked. Scoped to the **web layer**
(reviewer app + district backend); the ML/MATLAB pipeline has its own
requirements owned by Yash and is referenced here only where it crosses the
`report.json` boundary.

---

## 1. Problem statement

India has over 77 million diabetic adults — the second-highest diabetic
population globally. Diabetic retinopathy (DR) affects roughly 18% of that
population and is a leading cause of preventable blindness. Early screening can
prevent 90% of vision loss, but India has only about one ophthalmologist per
100,000 rural population, making mass manual screening infeasible at that ratio.

Diabetic retinopathy is asymptomatic until it is late, detectable from a
photograph long before it is symptomatic, and treatable when caught early. That
combination — silent, imageable, treatable, and under-screened — is exactly the
shape of problem machine vision is genuinely good at.

**The core problem, stated precisely** *(SIH blueprint §1.1)*:

> Given a fundus photograph of unknown and often poor quality, produce either
> (a) a refusal with actionable recapture guidance, or (b) a calibrated
> referable/non-referable decision accompanied by evidence sufficient for a
> remote ophthalmologist to confirm or overturn it in under 30 seconds — at a
> throughput that lets a district of 100,000+ annual patients be served by the
> ophthalmologists that district actually has.

This is not "classify fundus images." Classification alone is largely solved on
clean benchmark data and would not survive contact with a rural screening camp.

## 2. Product positioning

RetinaGuard is an **AI-assisted screening and triage aid — not an autonomous
replacement for ophthalmologists.** Every patient-affecting decision is made by
a human; the AI decides only what the human looks at first.

- **Not a diagnostic device.** It produces a screening recommendation and
  supporting evidence, never a diagnosis.
- **Not a replacement for dilated fundus examination** where clinically indicated.
- **Not clinically validated.** It is a prototype with measured benchmark
  performance, not approved by CDSCO or any other regulator.
- **Not a general ophthalmic screening tool.** It looks for DR and nothing else
  — no glaucoma, AMD, hypertensive retinopathy, or any other pathology.

No output of this system constitutes a diagnosis. Every referral decision that
reaches a patient passes through a qualified human reviewer. This positioning
statement is not a legal formality — it shapes every UI copy decision in the
reviewer app (see `docs/report-contract.md` §6, language rules).

## 3. Users and their jobs

*(Source: SIH blueprint §3.3, Table 3.1 — full five-persona table; the web layer
builds for the two marked below.)*

| User | Environment | What they need | What makes them abandon it |
|---|---|---|---|
| Screening technician | PHC room or camp tent, variable lighting | Instant, instructive quality verdict ("too dark — dim the room lamp"), not a score | Slow feedback; vague rejections; a recapture loop with no guidance |
| **★ Remote ophthalmologist** | District hospital, reviewing in batches between clinics | A package adjudicable in seconds: image, evidence overlay, confidence, one-line rationale, priority-ordered | Being shown undifferentiated cases; heatmaps that don't correspond to anything; reviewing cases the AI was already confident about |
| **★ District programme manager** | Administrative, monthly reporting | Coverage, referral volume, backlog, this month's bottleneck | Dashboards of model metrics they can't act on |
| Patient | Rural, may have travelled hours, may not return | A decision the same day, or a clear next step | Being asked to come back with no explanation |
| Engineering/QA | Development and monitoring | Reproducibility, drift signals, audit trail | Silent model changes; unversioned preprocessing |

★ = the two personas the web layer (this PRD's scope) builds for directly:
the **reviewer app** serves the ophthalmologist, the **dashboard** serves the
programme manager.

## 4. Scope — what we're building for SIH (25-day window)

*(Source: SDLC blueprint §18 MVP tiers; `plan.md` scope cuts, already agreed.)*

**Building:**
- Reviewer web app (worklist + case detail/adjudication screen)
- District backend (API, database, folder-watcher ingestion)
- Seeded demo data (6 fixture cases already committed, spanning the full triage
  spectrum)
- Programme dashboard (basic — coverage, referral volume, recapture rate)

**Faking for the demo:**
- Technician capture app — a recorded video, not a live camera. §69 of the SIH
  blueprint's demo flow needs a convincing reviewer screen, not live hardware.

**Not building (out of scope for the 25-day window):**
- Full sync protocol, multi-site deployment, TLS/auth hardening beyond MVP
- Redis, an outbox/event-bus pattern, external notification channels
  (see `docs/sequence-diagrams.md`, "what's deliberately absent")

**Not our problem (Yash's track):**
- The MATLAB/ML pipeline — quality assessment, segmentation, lesion detection,
  DR grading, Grad-CAM, calibration, Simulink capacity model. We consume its
  output through `docs/report-contract.md` and nothing more. If the ML pipeline
  is late or unavailable, the web layer still works end-to-end against fixtures.

## 5. The MATLAB↔web boundary

The entire integration between the ML track and the web track is
[`docs/report-contract.md`](report-contract.md) — a JSON file dropped into a
watched folder (`drop/{case_uuid}/report.json` + images + a `.done` sentinel),
validated against `schemas/report.schema.json`, and ingested idempotently by
`case_uuid`.

This PRD does not restate that 300-line spec. What matters here: the contract
means the web layer never needs to know MATLAB exists. It builds and ships
against synthetic fixtures (`fixtures/cases/`, 6 cases already committed) and
swaps in real MATLAB output with zero code change on either side.

## 6. Core user flows

*(Full step-by-step sequence diagrams: `docs/sequence-diagrams.md`. Summarized
here as the three flows that define the product.)*

**Flow A — Reviewer opens the worklist**
Reviewer sees a priority-ordered queue: P1 (urgent) → P0 (cannot assess) → P2
(refer) → P3 (rescreen, audit sample only). Each row shows a thumbnail, grade,
and confidence band — enough to triage which case to open first without
opening any of them.

**Flow B — Reviewer opens a case**
One screen. Image, grade, calibrated confidence, lesion evidence, recommendation
text, and what was *not* assessed — all visible without a second click. This is
the mechanism that makes a 30-second review possible; a reviewer who has to dig
for evidence has already blown the budget.

**Flow C — Reviewer adjudicates**
Agree / Disagree / Regrade / Ungradeable. The decision is logged and appended —
it never overwrites the AI's original grade, both stay available for later error
analysis (SIH blueprint §27.4). The queue advances to the next case.

## 7. Triage priority definitions

*(Source: SIH blueprint Table 5.2, `docs/report-contract.md` §4)*

| Level | Trigger | Queue behaviour |
|---|---|---|
| **P1 — Urgent** | P(grade ≥ 4) above threshold, or explicit large-haemorrhage/neovascularisation evidence | Jumps the queue; same-day adjudication target |
| **P0 — Cannot assess** | Grade-C quality after retries, or low-confidence abstention | Routed to reviewer with the original image and the reason. **Never** silently graded |
| **P2 — Refer** | P(grade ≥ 2) above threshold, not P1 | Standard referral queue |
| **P3 — Rescreen** | Below referral threshold, confident | Auto-cleared with audit sampling; no reviewer time unless sampled |

**P0 sits second in queue order, not last.** An ungradeable image on a diabetic
patient may be hiding advanced disease — the AI explicitly declined to help, and
that deserves attention ahead of a routine referral. This is the single most
common mistake to make implementing the worklist sort — flagging it here because
it's counterintuitive and easy to get wrong.

## 8. Non-goals

*(Source: SIH blueprint §2.3 — copied close to verbatim; this list is what keeps
the PRD honest under judge questioning.)*

- **Autonomous diagnosis without human review** — excluded on safety grounds.
- **Diabetic macular oedema (DME) grading** — APTOS carries no DME labels;
  IDRiD does, which makes DME a V2 candidate, never an MVP claim.
- **Other retinal pathology** (glaucoma, AMD, hypertensive retinopathy) — out
  of distribution. The system must never be represented as a general
  eye-screening tool.
- **OCT, fluorescein angiography**, or any modality other than colour fundus
  photography.
- **Regulatory submission artefacts** (IEC 62304, CDSCO dossier) — designed so
  as not to preclude them later, never claimed now.
- **Treatment recommendation of any kind.** The system outputs a referral
  triage level, never a therapy.

## 9. Success criteria for the web layer

*(Source: SDLC blueprint Gates G05/G07; ticket DoDs already defined in
`plan.md`. Deliberately not the ML metrics — sensitivity/specificity belong to
Yash's track.)*

- A fixture case round-trips through the full worklist → detail → adjudicate
  flow with no MATLAB present.
- Queue ordering is provably correct: P1 → P0 → P2 → P3, verified against all
  6 seeded fixtures.
- A reviewer can find grade, confidence, and evidence without a second click.
- Re-submitting a review decision (network retry) never double-counts or
  duplicates.
- Dropping the same `case_uuid` twice never creates a duplicate case.
- The dashboard renders non-zero, correct aggregates from seeded data.

## 10. Open questions

- [x] ~~Does this PRD include the architecture diagram?~~ **Resolved:** no —
  `docs/architecture-diagram.md` (Ticket A0, still pending) is the high-level
  actor/topology view; `docs/sequence-diagrams.md` (done) covers
  implementation-level flow detail. This PRD stays product-scoped.
- [ ] Final call on TypeScript vs. plain JS for the frontend (leaning
  TypeScript — see `plan.md`'s folder-structure discussion — not yet confirmed
  with Nitin).
- [ ] Whether the programme dashboard ships in the SIH demo or is cut if time
  runs short — currently "should build" (SDLC blueprint §18, P1 tier), not
  "must build."

---

**Sourcing note:** every claim above traces to the SIH blueprint (75 sections,
shared earlier this session), the SDLC execution blueprint
(`D:\Downloads\SDLC_Execution_Blueprint.md`), or a file already committed to
this repo. Nothing here is new invention — this document is synthesis and
scoping, consistent with the source blueprint's own claim-taxonomy discipline
(Table 0.1: REQUIRED / TARGET / ASSUMPTION / MEASURED / PUBLISHED /
TO BE VERIFIED — nothing in this PRD claims to be MEASURED, because nothing
has been measured yet).
