# Deterministic pipeline fixtures

Files here let the demo and the test suite force a specific pipeline outcome
without touching the model. The mock adapter looks for:

```
<first-16-chars-of-image-sha256>.quality.json
<first-16-chars-of-image-sha256>.grading.json
```

`*.quality.json` must match the `qualityAssessment` contract; `*.grading.json`
must match the `gradeDR` contract (see `../contracts.js`).

Typical demo set — Blueprint §20 opens with a deliberate quality refusal:

| Fixture              | Purpose                                          |
|----------------------|--------------------------------------------------|
| `*.quality.json` C   | Segment 1: quality gate refuses, actionable retake |
| `*.grading.json` G0  | Segment 2: clean pass, low priority              |
| `*.grading.json` G3  | Segment 3: severe NPDR, P0 triage                |
| low-confidence G2    | Segment 4: abstention → mandatory human review   |

Compute the digest with `sha256sum image.jpg` or `GET /images/:id` (`sha256` field).
