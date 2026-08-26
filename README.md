# Retina-Guard

**Explainable AI for Diabetic Retinopathy Screening in Rural India**

Smart India Hackathon 2026 · Problem Statement **26038** · Organisation: **MathWorks**

---

## What this is

A quality-gated, explainable, human-in-the-loop retinal screening pipeline, paired
with a Simulink model of the district screening service that turns measured
component latencies into staffing and equipment answers.

India has over 77 million diabetic adults and roughly one ophthalmologist per
100,000 rural population. Diabetic retinopathy is asymptomatic until late,
detectable from a photograph long before it is symptomatic, and treatable when
caught early — but mass manual screening is infeasible at that ratio.

The engineering problem is **not** "classify fundus images." It is a chain of five
coupled sub-problems, and the weakest link sets the value of the whole system:

1. A photograph taken in a village PHC is often not gradeable at all.
2. The lesions that matter earliest are only a few pixels across.
3. The clinically decisive output is binary (refer / do not refer), not five-way.
4. An unexplained prediction cannot be safely acted upon.
5. The bottleneck at district scale may not be the AI at all.

---

## Positioning

> **This is an AI-assisted screening and triage aid. It is not a diagnostic device,
> it is not clinically validated, and it is not approved by CDSCO or any other
> regulator.**
>
> No output of this system constitutes a diagnosis. Every referral decision that
> reaches a patient passes through a qualified human reviewer.

---

## Pipeline

```
FUNDUS IMAGE
     │
     ▼
[1] QUALITY GATE ───── Grade C (ungradeable) ──▶ RECAPTURE (max 2 attempts)
     │ Grade A / B                                        │ after 2 fails
     ▼                                                    ▼
[2] ENHANCEMENT (Grade B only, conservative)      flag "ungradeable",
     │                                             route to human
     ▼
[3] ANATOMY: field mask, optic disc, fovea, vessel map
     │
     ▼
[4] LESION EVIDENCE: MA / haemorrhage / exudate candidate maps
     │
     ▼
[5] DR MODEL: ordinal CNN → P(grade≥1..4), P(referable) = P(grade≥2)
     │
     ▼
[6] CALIBRATION + ABSTENTION: temperature-scaled; low confidence → escalate
     │
     ▼
[7] EXPLANATION: Grad-CAM + lesion overlay + anatomical context + confidence
     │
     ▼
[8] REPORT ──▶ [9] HUMAN REVIEW ──▶ FINAL SCREENING DECISION
```

---

## Repository layout

```
docs/           Engineering blueprint, report contract, ADRs
schemas/        JSON Schema for the MATLAB ↔ web boundary
matlab/         Image pipeline, model, explainability   (ML track)
simulink/       Telemedicine capacity model             (Simulink track)
backend/        District node: API, database, ingestion (Web track)
frontend/       Reviewer app + programme dashboard      (Web track)
fixtures/       Synthetic test cases - safe to commit
tests/          Unit, integration, end-to-end
```

`datasets/`, `models/` and `experiments/` are git-ignored — see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## The two tracks

The team works in two largely independent tracks that meet at exactly one place.

| Track | Owns | Stack |
|---|---|---|
| **ML / Simulink** | Quality assessment, segmentation, lesion detection, DR grading, Grad-CAM, capacity model | MATLAB + Simulink |
| **Web** | District backend, database, REST API, reviewer app, dashboard | Node / Python + Docker |

**The seam is [`docs/report-contract.md`](docs/report-contract.md).** The MATLAB
pipeline writes a JSON report plus overlay images into a drop folder; the backend
watches that folder and ingests. Neither side needs to understand the other's stack,
and both can build in parallel against the same document.

---

## Datasets

| Dataset | Role | Notes |
|---|---|---|
| [APTOS 2019](https://www.kaggle.com/c/aptos2019-blindness-detection) | Primary training + internal validation | ~3,662 labelled images. The ~1,928 test images are **unlabelled** and can never produce a supervised metric. |
| [IDRiD](https://ieeedataport.org/open-access/indian-diabetic-retinopathy-image-dataset-idrid) | Lesion supervision + explainability validation | Pixel-level lesion masks. The critical asset for proving heatmaps point at real lesions. |
| [DRIVE](https://drive.grand-challenge.org/) | Vessel segmentation only | 40 images. No usable DR labels. |
| [Messidor-2](https://www.adcis.net/en/third-party/messidor2/) | **External validation — sealed until final freeze** | Opened once. Never tuned against. |

Datasets are **never committed** and are read-only to all code.

---

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before your first commit.

**Short version:** nobody pushes to `main`. Branch off `dev`, open a PR, get one
review. The repo is public — check what you stage.

---

## Status

Early development. No measured results yet — every performance figure in the
blueprint is a target or an assumption until the validation phase fills it in.
