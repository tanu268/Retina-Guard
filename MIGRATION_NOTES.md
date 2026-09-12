# Migration Notes

## Dependencies added

Four, all frontend. No backend dependencies were added.

| Package | Why | Where |
|---|---|---|
| `@fontsource-variable/oswald` | Display font, bundled not CDN | `src/index.css` |
| `@fontsource/merriweather` | Body font, bundled not CDN (400 + 700) | `src/index.css` |
| `class-variance-authority` | Variant management for Card/Button (~2 kB) | `components/ui/index.tsx` |
| `lucide-react` | Icon vocabulary for the landing page; tree-shakes | landing components |

**Removed:** `@fontsource-variable/inter`.

### Why fonts are bundled rather than loaded from Google Fonts

The typography brief specified importing from Google Fonts. This application
runs at primary health centres with no reliable network — `index.css` carries an
existing comment about exactly this. A webfont that 404s offline is a broken
interface, so both fonts install as npm packages and are bundled into the build.
Same fonts, same rendering, works with the network down.

### Dependencies deliberately *not* added

The supplied prompts requested several that were unnecessary here:

- **`next`** — this is a Vite SPA. `next/link` became react-router's `Link`.
- **`@radix-ui/react-navigation-menu`** — the primitive exists for dropdown
  submenus with viewport animation; the navbar has three flat links and no
  submenus. ~30 kB in the landing page's critical bundle for markup a `<ul>`
  already provides. Rebuilt as ~60 lines with the same visual behaviour and full
  keyboard support.
- **`@radix-ui/react-icons`** — only used by the dropdown chevron that was not kept.
- **`motion`** — the rebranded package; `framer-motion` v12 is already installed
  with an identical API.

### Note on `lucide-react`

The installed version no longer ships brand marks, so `Github` and `Linkedin`
are inlined as small SVG components in `Landing.tsx`. If you upgrade lucide and
brand icons return, those two can be deleted in favour of imports.

---

## Integrating your trained model

The architecture is intact and the integration point is unchanged. Nothing about
the API contract, database schema, service interface or endpoints was altered by
the fake-model removal.

### The contract

`src/matlab/contracts.js` is the frozen interface. Six methods, each taking a
request object and returning a documented shape:

| Method | Purpose |
|---|---|
| `qualityAssessment` | Gradeability + reason codes |
| `preprocessImage` | Normalisation, returns preprocessed path |
| `detectAnatomy` | Optic disc, fovea, vessels |
| `detectLesions` | Lesion boxes, per-type counts |
| `gradeDR` | ICDR 0–4, class probabilities, confidence |
| `generateGradCAM` | Attention regions, heatmap artefact |

`assertGradingResponse()` and `assertQualityResponse()` validate every adapter
response. A malformed response fails loudly rather than becoming a silent grade.

### The switch

```bash
# .env
MATLAB_ADAPTER=cli
MATLAB_BIN=/usr/local/MATLAB/R2024b/bin/matlab
MATLAB_SCRIPT_DIR=./src/matlab/scripts
MODEL_VERSION=your-model-v1
MODEL_HASH=<sha256 of the weights>
```

`src/matlab/adapters/cliAdapter.js` is already written and was **not modified** —
it contains no fake data. It invokes MATLAB in batch mode:

```
matlab -batch "rg_entry('<requestFile>','<responseFile>')"
```

Each entry point reads a JSON request file and writes a JSON response file.
Nothing is parsed from stdout, because MATLAB licence banners and warnings
pollute stdout in the field. Implement these six entry points in
`MATLAB_SCRIPT_DIR`:

```
rg_quality_assessment.m
rg_preprocess_image.m
rg_detect_anatomy.m
rg_detect_lesions.m
rg_grade_dr.m
rg_generate_gradcam.m
rg_health.m
```

### What happens until then

`mockAdapter.js` sets `modelIntegrated = false`. `matlabService.runPipeline()`
checks that flag and abstains with `MODEL_NOT_INTEGRATED` **before** any
diagnostic stage runs — so no fabricated grade, lesion set or attention map can
be produced or persisted.

Downstream, that abstention is handled as a first-class state:

- **Reviewer queue** — case routes to review at P1, same as any abstention. The
  reviewer grades manually. Workflow fully functional.
- **PDF** — renders "Pending AI Analysis" with an explanation. The real triage
  priority is kept (it is genuinely computed); the model-version line is
  suppressed, since printing a version for a model that never ran would
  misattribute an absent decision to it. The explainability section is omitted
  entirely rather than asserting "no lesions detected" for a case where no
  detection was attempted.
- **Report generation, review, and sign-off** — all work end to end today.

When the real adapter lands, `MODEL_NOT_INTEGRATED` simply stops occurring. No
code downstream needs to change.

### Removing the mock entirely

Once `cli` is in production you can delete `src/matlab/adapters/mockAdapter.js`
and the `modelIntegrated` check in `matlabService.js`. Both are harmless if left
— the mock's three diagnostic methods throw rather than fabricate.

---

## Database migrations

Run before first start:

```bash
npm run migrate
```

Two new files, both additive and idempotent:

- `src/database/migrations/sqlite/004_diabetes_history.sql`
- `src/database/migrations/postgres/002_diabetes_history.sql`

The runner auto-discovers by filename sort, so no registration is needed.

**On existing data:** `diabetes_history` is backfilled from `diabetes_type`
(`type2 → yes`, `unknown → unknown`, no data → `NULL`). Verified against real
SQLite with pre-existing rows. No existing column is altered and no row is
rewritten, so the migration is safe to run on a populated edge node.

`diabetes_type` was left alone deliberately: its CHECK constraint has no way to
express "confirmed no diabetes", and altering it would have meant rebuilding the
table and every row for no functional gain.

---

## Configuration

### New endpoint

`GET /geo/states` and `GET /geo/districts?state=<name>` are **unauthenticated**
by design — state and district names are reference data, not patient
information, and the registration form needs them before a technician's session
is necessarily warm.

District boundaries change with administrative redraws. Treat
`src/config/indiaGeo.js` as data to refresh, not a constant.

### Village lookup (future)

Village is free text. If you want it structured, the hierarchy would be
State → District → Village, and the practical source is the LGD (Local
Government Directory) dataset, loaded into its own table and served through the
same `/geo` route with a typeahead. Bundling ~640,000 villages into the client
is not viable.

---

## Things to check before you demo

1. **Team section** — `src/data/team.ts` holds six placeholder members. Replace
   names, roles and profile links there; nothing else needs to change. Avatars
   fall back to generated monograms, so the layout does not break on missing
   images.
2. **Marquee images** — served from `/public/marquee`. Any patient whose face is
   recognisable needs a consent release before this goes public. If the fundus
   close-up came from APTOS/IDRiD, check the licence: several of those datasets
   are research-use-only, and a public landing page is not research use.
3. **Browser pass on the landing page** — it type-checks and builds, but was not
   visually rendered during this work.
4. **`better-sqlite3`** — if you move between machines, `npm rebuild
   better-sqlite3` after install.
