# RetinaGuard — Upgrade Report

Surgical upgrade of the existing codebase. No project regeneration; every change
is scoped to a file that needed it.

**Verification status:** the frontend passes `tsc --noEmit` and `vite build`
clean. Backend changes were verified by executing them — PDFs were actually
rendered and their text extracted, the migration was run against real SQLite
with pre-existing rows, the validation schema was tested against a 13-case
matrix, and the RBAC middleware was tested against every role combination.
What could *not* be run here is a full server boot: this sandbox has no network
access to rebuild the `better-sqlite3` native binding. See "Not verified" at the
end.

---

## 1. Design system

### Tokens — `src/index.css` (rewritten, 206 → 335 lines)

One source of truth. No component defines its own radius, spacing, shadow, font
or motion timing.

| Token group | Notes |
|---|---|
| Brand ramp | `--color-brand-50` … `--color-brand-950`, derived from the supplied `#9FB3DF` |
| Palette tints | `--color-sky-tint`, `--color-mist-tint`, `--color-sand-tint` — the supplied hexes, held as surface tints |
| Semantic | `--color-primary`, `-hover`, `-active`, `--color-surface`, `--color-border`, `--color-ink*`, etc. |
| Radius | `--radius-none: 0`, `--radius-hairline: 2px` |
| Spacing | `--space-1` … `--space-10`, plus `--space-section` (fluid) |
| Type scale | `--text-display-1/2`, `--text-h1…h4`, fluid via `clamp()` |
| Shadows | `--shadow-xs` … `--shadow-xl`, `--shadow-glass` |
| Motion | `--duration-instant…reveal`, `--ease-out-quart`, `--ease-in-out-soft` |

### Accessibility finding — the supplied palette could not carry the UI

All four supplied colours are tints. Contrast against white:

| Colour | Ratio | AA body text (4.5:1) | AA UI (3:1) |
|---|---|---|---|
| `#9FB3DF` | 2.10:1 | fail | fail |
| `#9EC6F3` | 1.78:1 | fail | fail |
| `#BDDDE4` | 1.44:1 | fail | fail |
| `#FFF1D5` | 1.12:1 | fail | fail |

A primary button in any of them would have been unreadable — and considerably
worse on a tablet in a daylit village clinic than the number suggests. All four
are used exactly as supplied for the gradient and surface tints; a dark anchor
derived from the same hue family, **`#1E3A6E` (11.14:1 on white)**, carries text
and actions. Clinical triage colours (P0–P3) were deliberately left untouched —
they encode medical urgency and must not be aestheticised.

### Geometry sweep

- **113** `rounded-*` utilities → `rounded-none`
- **12** progress bars → `--radius-hairline` (a hard 0 there reads as a render fault)
- **8** genuine circles kept (status dots, bullets) — pills, chips and step badges squared
- **3** CSS radius values tokenised
- Verified: zero non-square radii remain outside the two intentional categories

---

## 2. Components created

| File | Purpose |
|---|---|
| `components/background/GradientWave.tsx` | WebGL mesh gradient, adapted from the supplied spec |
| `components/background/GlobalBackground.tsx` | The single background mount for the whole app |
| `components/ui/NavLink.tsx` | Shared nav primitive — underline indicator, horizontal + vertical |
| `components/ui/Modal.tsx` | Dialog with focus trap, Escape, scroll lock, blur backdrop |
| `components/landing/LandingNav.tsx` | Sticky navbar, blur-on-scroll, scroll-spy, mobile sheet |
| `components/landing/MarqueeHero.tsx` | Hero with the ten-image story marquee |
| `pages/landing/Login.tsx` | Sign-in — see "Behaviour changes" below |
| `data/team.ts` | Team members — one file to edit when real names arrive |
| `data/marquee.ts` | Marquee image manifest with real alt text |

## 3. Components updated

| File | Change |
|---|---|
| `components/ui/index.tsx` | `Card` gains 6 variants; `Button` restyled to tokens, API preserved |
| `components/layout/AppShell.tsx` | Admin removed from Screening / Review / Records nav groups |
| `pages/landing/Landing.tsx` | Rebuilt to the six-section structure and supplied copy |
| `pages/admin/AdminUsers.tsx` | Rebuilt — full CRUD, confirmation dialog, self-action guards |
| `pages/admin/AdminOverview.tsx` | Real administrative metrics, district chart, activity feed |
| `pages/technician/PatientRegistration.tsx` | Conditional diabetes fields, cascading dropdowns, strict phone |
| `App.tsx` | Background mount, `/login` route, admin route guards tightened |
| `types/index.ts` | `AdminDashboard` extended; user-management and `diabetesHistory` types |
| `services/api.ts` | Admin user CRUD + `geoService` |

### Card variants
`default` · `glass` · `elevated` · `interactive` · `dashboard` · `showcase`

The supplied glass-card's *language* carried over (layered depth, lit top edge,
staggered inner transitions, real glassmorphism). Its literal geometry did not —
`rounded-[50px]`, the fixed 290×300px box, the dark surface, and the 30° hover
tilt all conflicted with the Global Design Directive, which explicitly overrides.
The 3D tilt survives as the opt-in `showcase` variant for the landing page only,
where there is no clinical data to read.

### Button
Existing API preserved exactly (`variant`, `size`, `loading`, `icon`,
`fullWidth`) — **50 existing call sites** continue to work unchanged. Variants:
`primary` · `secondary` · `outline` · `ghost` · `danger` · `success`.

---

## 4. Bugs found and fixed in the supplied components

These were defects in the specs as delivered, not choices.

### GradientWave (4)
1. **Out-of-bounds vec4 read.** The shader loops `u_active_colors[i + 1]` on a
   `vec4` (valid indices 0–3); the default prop passed 6 colours → indices up to
   5. Undefined behaviour, garbage output on some drivers. Clamped to 4.
2. **WebGL context rebuilt every render.** `colors`, `noiseFrequency` and
   `deform` sat in the dependency array as object/array literals, so references
   changed each render. Serialised.
3. **Leaked resize listener** — registered inside `init()`, never removed.
4. **GL context never released.** Browsers cap concurrent contexts (~16). Added
   `WEBGL_lose_context` on cleanup.

Plus: `prefers-reduced-motion` renders one static frame; rendering pauses when
the tab is hidden or the element is offscreen; a CSS-gradient fallback covers
WebGL-unavailable hardware.

### MarqueeHero (3)
1. **Visible seam every cycle.** Array duplicated once but animated the full
   width (`-100% → 0%`); a seamless loop needs `-50%` of a doubled strip. Also
   switched flex `gap` → per-item margin (gap omits the trailing gap, leaving a
   half-gap discrepancy at the join).
2. **Stagger delays never fired.** `transition={{delay}}` was passed alongside a
   variant declaring its own transition — the variant wins, so everything
   animated at once. Delays moved into the variants.
3. **`100vh` clipped the marquee on mobile.** → `100dvh`.

### Navbar (1)
`isActive: true` was hardcoded on "Home", which would have left it lit on every
section. Replaced with an IntersectionObserver scroll spy.

### Button spec (1)
The glass-button prompt referenced four CSS classes
(`glass-button-wrap/-button/-shadow/-text`) that were **not included in the
prompt**, and `all-unset`, which is not a Tailwind utility. As delivered it
rendered unstyled. Reconstructed from the layering structure.

---

## 5. Backend

### PDF generation — root cause found

`reportService.generate()` called `this.pdf.render(model, path)`, but
`pdfService.render()` opens with:

```js
const body = typeof report.payload === 'string' ? JSON.parse(report.payload) : (report.payload || {});
```

The model has no `.payload` key, so `body` fell through to `{}` and **every
field rendered empty**. The PDF was not corrupt — it was a structurally valid,
blank A4 document, which is why it looked broken rather than erroring.

Four aligned mismatches followed from the same divergence:

| Renderer read | Model provided | Result |
|---|---|---|
| `report.report_number` | `reportNumber` | undefined in title |
| `body.image.absolutePath` | `images.fundusPath` (relative) | fundus never embedded |
| `body.explainability.gradcamPath` | `images.gradcamPath` | heatmap never embedded |
| `body.verification.url` | `qrToken` | QR never rendered |

**Fixed:** `buildModel()` rewritten to the renderer's contract. Added every
required report field (phone, state, HbA1c, diabetes history, eye screened,
screening date). Reviewer name and registration number were hardcoded `null` —
now resolved via `userRepository`. `Content-Disposition` supports
`?download=1` with the `RetinaGuard_Report_*.pdf` filename. Missing PDF files
are re-rendered from the stored JSON payload instead of 404ing. Row heights in
`keyValues()` are now measured rather than a fixed 30px, so long values no
longer overlap the row beneath.

### AI pipeline — fake model removed, infrastructure kept

**Discovery:** `matlabService.js` requires `mockAdapter.js` / `cliAdapter.js`;
the `MockMatlabAdapter.js` / `EngineMatlabAdapter.js` / `MatlabAdapter.js` files
were differently-cased duplicates referenced by nothing. Deleted as dead code
after confirming by grep.

- `mockAdapter.js` — fabrication removed from `gradeDR`, `detectLesions`,
  `generateGradCAM` (each now throws an honest "not integrated" error as a
  backstop). `qualityAssessment`, `preprocessImage`, `detectAnatomy` untouched —
  they gate the capture workflow's recapture logic, not the diagnosis.
- `matlabService.js` — a `modelIntegrated === false` check abstains cleanly
  *before* any diagnostic stage runs, so fabrication is structurally
  unreachable, not merely deleted.
- `cliAdapter.js` — **already correct, unchanged.** This is the integration
  point: it shells out to real MATLAB scripts via a JSON contract with no fake
  data anywhere.
- **Untouched:** `analysisService.js`, the `analysis` DB schema, and all
  analysis routes/controller/schema/repository.

### RBAC — a real enforcement gap

`middleware/authorize.js` contained:

```js
if (roles.length && !roles.includes(req.user.role) && req.user.role !== 'admin') {
```

That trailing clause meant **every `authorize()` call in the application
silently admitted admin**, regardless of the roles declared. Editing a route's
role list had no enforcement effect for admin at all. Verified that every route
legitimately needing admin already lists it explicitly, then removed the bypass
and confirmed the fix against all role combinations.

Admin stripped from Screening / Review / Records at three layers: sidebar nav,
frontend route guards, backend `authorize()` calls. Previously-ungated GET
routes on patients, consultations, images and analysis are now explicitly gated.

### Server could not start — pre-existing bug

`repositories/index.js` required `'./refreshTokenRepository'` and
`'./explainabilityRepository'`, but the files on disk are
`RefreshTokenRepository.js` and `ExplainabilityRepository.js`. On a
case-sensitive filesystem this crashed `container.js` at require time, meaning
the backend could not boot at all. Same class of bug as the adapter duplicates.
Fixed; container now builds.

### Validation

**Phone** — the previous rule `/^[0-9+\-\s]{7,15}$/` accepted `98765` and
`987654321012`. Since the phone number is how a screening camp recalls a patient
for referral, a malformed number is a patient who never hears their result. Now
exactly ten digits, first digit 6–9, with normalisation so a pasted
`+91 98765 43210` is accepted and stored as `9876543210`.

**Diabetes conditional** — enforced in both the form and the schema:

| History | Duration | HbA1c |
|---|---|---|
| Yes | shown, accepted | shown, accepted |
| No | hidden, rejected | hidden, rejected |
| Unknown | hidden, rejected | hidden, rejected |

Changing the history **auto-clears** previously-entered values, so a stranded
HbA1c cannot sit invisibly in state and fail server-side on a field the
technician can no longer see. The schema *rejects* rather than silently drops
contradictory input.

**Location** — 36 states/UTs × 756 districts (`config/indiaGeo.js`), served via
a new unauthenticated `/geo` route (reference data, not PHI). Cascading
dropdowns; the backend rejects invalid state/district pairs. Village remains
free text — India has ~640,000 villages and no bundled list would stay current.

All 13 validation cases verified by execution.

### Administrator redesign

Dashboard now returns live figures — total patients, per-role user counts,
active users, screenings completed, district-wise distribution, storage, sync
health, and recent activity. No placeholder values.

Full user CRUD: create / edit / disable / enable / delete, for technicians,
reviewers and administrators. Delete is a soft-delete (case records, reports and
audit entries hold the user id as a foreign key; a hard delete would either
cascade into clinical history or fail on the constraint). Self-deletion and
self-deactivation are blocked server-side *and* disabled in the UI. Deletion
requires typing the username to confirm.

`listUsers` switched from `listActive` to a new `listAll` — the previous version
filtered to `is_active = 1`, which hid disabled accounts entirely, and an
account you cannot see is one you cannot re-enable.

### Database

`004_diabetes_history.sql` (SQLite) + `002_diabetes_history.sql` (Postgres).

`diabetes_type` is CHECK-constrained to
`('type1','type2','gestational','unknown')` — there is no way to express
"confirmed no diabetes" in it. Rather than rebuild the table to alter that
constraint, the migration adds `diabetes_history` additively and backfills from
existing data. Verified against real SQLite with pre-existing rows:
`type2 → yes`, `unknown → unknown`, no prior data → stays `NULL` rather than
guessed.

---

## 6. Behaviour changes worth knowing

1. **Sign-in moved to `/login`.** The old landing page *was* the sign-in surface
   — it carried the role picker. The new six-section structure has no such
   section, so removing it would have left no way into the app. The picker moved
   to a dedicated page behind "Start Screening". No auth logic changed.
2. **Contact page** removed as requested; contact info lives in the footer only.
3. **Admin loses Screening/Review/Records.** District retains Records, since
   district users still need to look up individual patients.

---

## 7. Accessibility

- AA contrast on all text and controls (the palette finding above)
- `prefers-reduced-motion` honoured by the gradient, marquee and all transitions
- Modal: focus trap, Escape, scroll lock, focus restored on close
- `aria-current="page"` on active nav; `aria-expanded`/`aria-controls` on the mobile toggle
- Marquee images carry real alt text (the strip carries the product narrative);
  duplicated tiles are `aria-hidden`
- Colour never sole carrier of meaning — triage tiers keep their text labels

---

## 8. Performance

- Landing bundle **23 kB (6.9 kB gzipped)** — lucide tree-shakes to only the icons used
- Marquee images: 10 × WebP at 900×1200, **994 kB total**; first six eager, rest lazy
- Gradient pauses when hidden/offscreen; GL context released on unmount
- Mesh segment counts clamped (8–48) so ultra-wide displays don't build a needlessly dense mesh
- Fonts bundled via `@fontsource`, not CDN — see Migration Notes

---

## 9. Not verified in this environment

- **No full server boot.** `better-sqlite3` is a native module and this sandbox
  has no network access to fetch Node headers to rebuild it. Module resolution,
  syntax, container construction, PDF rendering, migration SQL, validation
  schema and RBAC middleware were all verified by execution; end-to-end HTTP
  request/response was not.
- **Jest suite not run**, for the same reason. `tests/integration/rbac.test.js`
  was inspected and does not depend on the removed admin bypass.
- The landing page was **not visually rendered** here — it type-checks and
  builds, but a browser pass is worth doing before you demo it.
