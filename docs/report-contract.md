# Report Contract v1.0.0

**The integration boundary between the MATLAB pipeline and the web layer.**

This document is the entire integration. The MATLAB side writes files matching this
spec; the web side reads them. Neither side needs to understand the other's stack.

---

## 1. The handoff

The MATLAB pipeline writes one directory per case into a **drop folder**:

```
drop/
  {case_uuid}/
    report.json           # REQUIRED - everything below
    thumb.jpg             # REQUIRED - ~256px, worklist thumbnail
    review_1536.jpg       # REQUIRED - ~1536px, what the reviewer actually reads
    overlay_cam.png       # OPTIONAL - Grad-CAM, transparent PNG, same aspect as review_1536
    overlay_lesions.json  # OPTIONAL - vector lesion markers (see section 5)
    original_1.jpg        # OPTIONAL - native resolution, fetched on demand only
    .done                 # REQUIRED - written LAST, see section 2
```

`case_uuid` is a UUID v4 generated **once** at capture and never regenerated.
It is the idempotency key: re-dropping the same `case_uuid` must be safe and
must not create a duplicate record.

### Why files and not an API

The web developer has no MATLAB experience and cannot invoke it directly. A folder
contract means each side builds independently against this document. It is also
inherently offline-first — a directory needs no network — which matches the rural
deployment constraint.

---

## 2. The `.done` sentinel — important

The watcher must never ingest a half-written directory. **Write `.done` last**, after
every other file is closed and flushed. The watcher ignores any directory without it.

```matlab
% MATLAB side, at the very end of the case
fid = fopen(fullfile(caseDir, '.done'), 'w'); fclose(fid);
```

Recommended: write the whole case to `drop/.staging/{case_uuid}/` first, then
atomically rename into `drop/{case_uuid}/`. A rename on the same volume is atomic
and removes the partial-read race entirely.

---

## 3. `report.json`

All fields are required unless marked optional. Unknown extra fields are ignored by
the backend, so the MATLAB side may add its own without breaking anything.

```json
{
  "schema_version": "1.0.0",

  "case_uuid": "3f2b1c88-9d4e-4a71-b0c5-2e8a17d6f403",
  "patient_id": "PSEUDO-004182",
  "laterality": "OD",
  "laterality_source": "inferred",
  "captured_at": "2026-08-26T10:32:11Z",
  "device_id": "CAM-PHC07-02",
  "operator_id": "TECH-114",
  "attempt_number": 1,

  "quality": {
    "grade": "A",
    "decision": "proceed",
    "reason": null,
    "features": {
      "focus_score": 0.91,
      "illumination_uniformity": 0.88,
      "vessel_resolvability": 0.84,
      "field_coverage": 0.97,
      "contrast": 0.79,
      "saturated_fraction": 0.002,
      "crushed_fraction": 0.001,
      "optic_disc_detectable": true,
      "macula_visible": true
    }
  },

  "prediction": {
    "grade": 2,
    "grade_label": "moderate_npdr",
    "ordinal": {
      "p_ge_1": 0.94,
      "p_ge_2": 0.83,
      "p_ge_3": 0.21,
      "p_ge_4": 0.06
    },
    "referable": true,
    "referable_threshold": 0.41,
    "confidence": 0.83,
    "confidence_band": "moderate",
    "calibrated": true,
    "monotonicity_ok": true
  },

  "triage": {
    "level": "P2",
    "abstained": false,
    "escalation_rules_fired": []
  },

  "lesions": {
    "red_lesions": {
      "count": 12,
      "mean_probability": 0.71,
      "within_1dd_of_fovea": 4
    },
    "hard_exudates": {
      "count": 5,
      "mean_probability": 0.82,
      "total_area_mm2": 0.4,
      "quadrants": ["superotemporal"]
    },
    "soft_exudates": {
      "count": 0,
      "mean_probability": null
    }
  },

  "anatomy": {
    "optic_disc": { "cx": 1620, "cy": 1080, "radius_px": 195, "confidence": 0.93 },
    "fovea":      { "cx": 1105, "cy": 1142, "confidence": 0.81 },
    "disc_diameter_px": 390,
    "geometry_selftest_passed": true
  },

  "artifacts": {
    "thumb": "thumb.jpg",
    "review": "review_1536.jpg",
    "overlay_cam": "overlay_cam.png",
    "overlay_lesions": "overlay_lesions.json",
    "original": "original_1.jpg"
  },

  "limits": {
    "min_detectable_lesion_um": 45,
    "not_assessed": ["neovascularisation", "diabetic_macular_oedema"]
  },

  "recommendation": {
    "code": "REFER_ROUTINE",
    "text": "Refer for ophthalmic assessment. Routine priority."
  },

  "versions": {
    "model_version": "v0.2-effb0-512",
    "preprocessing_hash": "sha256:9c1f...",
    "dataset_version": "aptos-2019-v1",
    "pipeline_commit": "a1b2c3d"
  }
}
```

---

## 4. Field reference

### Identity

| Field | Type | Notes |
|---|---|---|
| `schema_version` | string | Semver. Backend rejects a major version it does not know. |
| `case_uuid` | string (uuid4) | Idempotency key. Generated once at capture. |
| `patient_id` | string | **Pseudonymous only.** Never a real name. |
| `laterality` | `OD` \| `OS` \| `unknown` | OD = right eye, OS = left. |
| `laterality_source` | `metadata` \| `inferred` | Inferred = derived from optic disc position. Shown as inferred in the UI. |
| `captured_at` | string | ISO 8601, **UTC, with `Z`**. |
| `device_id` | string | Required for per-device drift monitoring. |
| `operator_id` | string | |
| `attempt_number` | integer ≥ 1 | Increments on recapture. |

### `quality`

| Field | Type | Notes |
|---|---|---|
| `grade` | `A` \| `B` \| `C` | A = good, B = borderline (enhanced), C = ungradeable. |
| `decision` | `proceed` \| `enhanced` \| `recapture` \| `ungradeable` | |
| `reason` | string \| null | **Operator-facing and actionable.** "Out of focus — refocus on the optic disc", not "score 0.31". Required when grade is B or C. |
| `features` | object | All floats 0–1 except the two booleans. Used by the dashboard and drift monitoring. |

> A Grade C case still produces a full `report.json` — with `prediction` set to `null`
> and `triage.level` = `P0`. It is never silently dropped.

### `prediction`

Set the whole object to `null` when the case was refused or abstained.

| Field | Type | Notes |
|---|---|---|
| `grade` | 0–4 | ICDR scale. |
| `grade_label` | enum | `no_dr`, `mild_npdr`, `moderate_npdr`, `severe_npdr`, `proliferative_dr`. |
| `ordinal` | object | Four cumulative probabilities. **`p_ge_2` is the referable decision** — it is a directly supervised head, not a sum of softmax outputs. |
| `referable` | boolean | Must equal `p_ge_2 > referable_threshold`. Backend asserts this. |
| `referable_threshold` | float | The frozen τ\*. Sent per case so the UI can show the operating point. |
| `confidence` | float 0–1 | Calibrated. |
| `confidence_band` | `high` \| `moderate` \| `low` | Plain language for the reviewer. |
| `calibrated` | boolean | False means temperature scaling was not applied — UI warns. |
| `monotonicity_ok` | boolean | False when p_ge_1 ≥ p_ge_2 ≥ p_ge_3 ≥ p_ge_4 was violated. Free anomaly signal. |

### `triage`

| Field | Type | Notes |
|---|---|---|
| `level` | `P0` \| `P1` \| `P2` \| `P3` | P0 = cannot assess/abstained, P1 = urgent, P2 = refer, P3 = rescreen. |
| `abstained` | boolean | |
| `escalation_rules_fired` | array of string | Any of `E1`–`E9`. Empty array when none. Drives the "why is this here" line in the worklist. |

**Queue order is `P1 → P0 → P2 → P3`.** P0 sits second deliberately: an ungradeable
image on a diabetic patient may be hiding advanced disease, and it is the case where
the AI explicitly declined to help.

### `lesions`

Counts and aggregates only. Per-lesion coordinates live in `overlay_lesions.json`.
Any category may be `{"count": 0, "mean_probability": null}`.

### `anatomy`

Pixel coordinates are in **`review_1536.jpg` space**, not the original. This lets the
frontend overlay markers without knowing the source resolution. If
`geometry_selftest_passed` is false, the UI suppresses all fovea-relative distances.

### `limits`

| Field | Notes |
|---|---|
| `min_detectable_lesion_um` | Per-image detection floor. The UI shows this verbatim — it tells the clinician what could *not* have been found. |
| `not_assessed` | Rendered explicitly. A reviewer must never infer absence from silence. |

### `recommendation`

`code` is one of `RESCREEN_ROUTINE`, `REFER_ROUTINE`, `REFER_URGENT`, `CANNOT_ASSESS`.
`text` is fixed template text — **never free-form generated**. No LLM anywhere in this path.

---

## 5. `overlay_lesions.json` (optional)

Vector markers, not a baked raster. A few hundred bytes instead of an image, and it
lets the reviewer toggle layers independently.

```json
{
  "coordinate_space": "review_1536",
  "width": 1536,
  "height": 1024,
  "lesions": [
    { "type": "red_lesion",   "cx": 812, "cy": 640, "r": 4, "p": 0.88 },
    { "type": "hard_exudate", "cx": 1030, "cy": 410, "r": 9, "p": 0.76 }
  ]
}
```

`type` ∈ `red_lesion`, `hard_exudate`, `soft_exudate`. `p` is the per-candidate
detection probability — the UI sizes/opacities markers by it, so the reviewer sees
graded evidence rather than a binary overlay that is silently wrong 40% of the time.

---

## 6. Language rules the JSON must respect

These are enforced by the frontend, but the MATLAB side must not fight them.

| Never emit | Emit instead |
|---|---|
| `"diagnosis"` anywhere | `recommendation.code` |
| "The patient has 12 microaneurysms" | `red_lesions.count` with `mean_probability` |
| "Normal" | `RESCREEN_ROUTINE` |
| Free-text prose in `recommendation.text` | Fixed template text |

The system is a **screening and triage aid**, not a diagnostic device. Every field
name above was chosen to make an overclaim awkward to express.

---

## 7. Validation

`schemas/report.schema.json` is the machine-checkable version of this document.

```bash
python scripts/validate_report.py fixtures/cases/<case_uuid>/report.json
```

The MATLAB side should run this against its output before considering a case done.
The backend runs it on every ingest and quarantines anything that fails.

---

## 8. Changelog

| Version | Change |
|---|---|
| 1.0.0 | Initial contract. |
