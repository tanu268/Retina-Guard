# MATLAB_INTEGRATION.md

## The contract

`src/matlab/contracts.js` defines the frozen JSON shapes exchanged between
Node and MATLAB: the five ICDR grade definitions, quality-reason codes,
lesion types, abstention reasons, and two validator functions
(`assertGradingResponse`, `assertQualityResponse`). **Every** adapter — mock
or real — must satisfy these shapes exactly. `MatlabService` runs the
validators on every response before persisting anything, so a malformed
MATLAB output fails loudly as a `502 MATLAB_ERROR` instead of silently
becoming a wrong grade.

```
Express controller
      │
      ▼
MatlabService.runPipeline()      ← src/matlab/matlabService.js
      │  quality → preprocess → anatomy → grading → lesions → gradcam
      │  (times every stage; converts any failure into an abstention)
      ▼
adapter.{qualityAssessment, preprocessImage, detectAnatomy,
         detectLesions, gradeDR, generateGradCAM}(request) → response JSON
      │
      ├── MockMatlabAdapter   (src/matlab/adapters/mockAdapter.js)  ← default
      └── MatlabCliAdapter    (src/matlab/adapters/cliAdapter.js)   ← real MATLAB
```

## Swapping mock → real

1. Freeze the model artefact (Blueprint Gate 08/09) and implement the six
   `.m` entry points in `src/matlab/scripts/` (`rg_quality_assessment.m`,
   `rg_preprocess_image.m`, `rg_detect_anatomy.m`, `rg_detect_lesions.m`,
   `rg_grade_dr.m`, `rg_generate_gradcam.m`). Each currently raises
   `NotImplemented` on purpose.
2. Each entry point receives two file paths — a request JSON and a response
   JSON — never stdin/stdout, because MATLAB licence banners and toolbox
   warnings pollute stdout in the field:
   ```matlab
   function rg_grade_dr(requestFile, responseFile)
       req = jsondecode(fileread(requestFile));
       % ... inference ...
       res = struct('drGradeCode', code, 'drGrade', label, ...);
       fid = fopen(responseFile, 'w'); fwrite(fid, jsonencode(res)); fclose(fid);
   end
   ```
   On any failure, write `{"error": "<message>"}` and nothing else — a
   partial result must never reach `MatlabService`.
3. Set in `.env`:
   ```
   MATLAB_ADAPTER=cli
   MATLAB_BIN=/usr/local/MATLAB/R2024b/bin/matlab
   MATLAB_SCRIPT_DIR=./src/matlab/scripts
   MODEL_VERSION=retinaguard-effnetb0-512-v1
   MODEL_HASH=<sha256 of the frozen .mat artefact>
   PREPROCESSING_HASH=<sha256 of the frozen preprocessing config>
   ```
4. Restart the API. **No route, controller, service, or frontend code
   changes.** `GET /health/matlab` will report `adapter: "cli"` and
   `matlabRuntime: true` once MATLAB responds to `rg_health`.

`MatlabCliAdapter` invokes `matlab -batch "addpath(...); rg_entry(req,res);"`
with a per-call temp directory and a configurable timeout
(`MATLAB_TIMEOUT_MS`), and cleans up after itself in a `finally` block even
on timeout or crash.

## Why the mock is deterministic, not random

`MockMatlabAdapter` seeds a small PRNG from the image's SHA-256
(`utils/hash.js:sha256`), so **the same image file always produces the same
grade, lesions, anatomy and Grad-CAM regions** — both across repeated calls
in one process and across process restarts. This matters twice:

- **Tests never flake.** `tests/unit/matlabService.test.js` asserts the same
  hash yields identical output on two separate calls.
- **The demo is reproducible.** Blueprint §20 requires "deterministic demo,
  no live dependency." A rehearsed image always shows the same result live.

## Forcing a specific demo outcome

Drop a JSON fixture in `src/matlab/fixtures/` named
`<first-16-hex-chars-of-sha256>.quality.json` or `.grading.json`, matching the
`assertQualityResponse` / `assertGradingResponse` contract. The mock adapter
checks for a fixture before falling back to its seeded PRNG. See
`src/matlab/fixtures/README.md` for the demo script's recommended fixture set
(a forced Grade-C refusal, a clean low-priority pass, a severe/P0 case, and a
forced abstention).

## The abstention rule (why "pipeline succeeded" isn't the end of the story)

Even when every MATLAB stage returns a valid response, `AnalysisService` runs
a **second, independent** check (`clinicalSafetyService.evaluateAbstention`)
before it will persist a grade:

| Condition | Reason code |
|---|---|
| `confidence < ABSTENTION_CONFIDENCE_THRESHOLD` | `LOW_CONFIDENCE` |
| `referableProbability` within 0.05 of `REFERABLE_PROBABILITY_THRESHOLD` | `BORDERLINE_THRESHOLD` |
| Grad-CAM highlights a region, lesion branch finds nothing, case is referable | `EXPLANATION_DISAGREEMENT` |
| Image quality is Grade C | `UNGRADEABLE_IMAGE` |
| Any pipeline stage throws | `STAGE_FAILURE` |

An abstained analysis is still written to `analysis_results` (`status =
'abstained'`), still routes the case to `awaiting_review`, and still gets a
`P1` triage priority — an uncertain case is treated as *more* urgent for a
human than a confident low grade, not less.

## Measured latency, not invented numbers

`stageTimingsMs` on every analysis record (`quality_assessment`, `preprocess`,
`anatomy_detection`, `dr_grading`, `lesion_detection`, `gradcam`, `total`) is
wall-clock time from `utils/time.js:stopwatch()` around each real adapter
call — mock or CLI. `analysisRepository.stageTimingSamples()` exposes these
for the Simulink/SimEvents district capacity model. The blueprint is explicit
that SimEvents must never be calibrated on invented numbers; this is the one
and only place those numbers come from.
