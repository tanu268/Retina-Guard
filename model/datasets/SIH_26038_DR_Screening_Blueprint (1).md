**SMART INDIA HACKATHON · PROBLEM STATEMENT 26038**

**Explainable AI for Diabetic Retinopathy**

**Screening in Rural India**

Implementation-Ready Engineering Blueprint

_A MATLAB-first, Simulink-integrated, clinically-aware system design for_

_AI-assisted retinal screening and triage at district scale_

| **Field**            | **Value**                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Problem Statement ID | 26038                                                                                                                                       |
| Title                | Explainable AI for Diabetic Retinopathy Screening in Rural India                                                                            |
| Organization         | MathWorks                                                                                                                                   |
| Category / Theme     | Software · Clean & Green Technology                                                                                                         |
| Core technologies    | MATLAB (mandatory), Simulink (mandatory), Deep Learning Toolbox, Image Processing Toolbox, Computer Vision Toolbox, Statistics & ML Toolbox |
| Datasets in scope    | APTOS 2019 Blindness Detection, IDRiD, DRIVE, Messidor-2                                                                                    |
| Document type        | Technical blueprint — design and implementation plan                                                                                        |
| Document status      | **Design specification. Contains no measured experimental results.**                                                                        |

# **Contents**

_If this page appears empty, open in Microsoft Word, select the whole document (Ctrl+A) and press F9 to build the table of contents._

# **Document Control and How to Read This Blueprint**

This document is a build specification, not a results report. Every number inside it is one of four kinds, and the kind is always labelled. Confusing them is the single fastest way to lose credibility in front of a technical panel.

| **Label used in this document** | **Meaning**                                                                                                                                          | **Example**                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **REQUIRED**                    | A target written into the SIH problem statement. Non-negotiable as an objective; not guaranteed as an outcome.                                       | ≥90% sensitivity for referable DR                    |
| **TARGET**                      | An engineering target this team sets for itself. Chosen to be ambitious but defensible.                                                              | End-to-end CPU latency P95 ≤ 8 s                     |
| **ASSUMPTION**                  | A modelling input with no measurement behind it yet. Always accompanied by the sensitivity of conclusions to it.                                     | Referable-DR prevalence in screened population ≈ 12% |
| **MEASURED**                    | A number produced by running our own code on our own held-out data. This document contains none yet — the field exists so results can be dropped in. | (to be filled at Phase 9)                            |
| **PUBLISHED**                   | A number from external literature or a dataset release, used for calibration of expectations only.                                                   | Reported QWK ranges on APTOS leaderboards            |
| **TO BE VERIFIED**              | A dataset or tooling property we believe to be true but have not confirmed against the actual release or MATLAB version in hand.                     | Exact IDRiD segmentation split counts                |

_Table 0.1 — Claim taxonomy. Used consistently throughout the document._

**Clinical and regulatory position**

The system specified here is an **AI-assisted screening and triage aid**. It is not a diagnostic device, it is not clinically validated, it is not approved by CDSCO or any other regulator, and it must not be represented as any of those things.

No output of this system constitutes a diagnosis. Every referral decision that reaches a patient passes through a qualified human reviewer. Where this document uses clinical vocabulary, it does so to specify engineering behaviour, not to make medical claims.

## **Reading paths**

**Judge / evaluator (20 min):** Executive Summary → §2 Requirement Decomposition → §24 Explainability → §37 District Capacity Simulation → §69 Demo Flow → §73 Final Recommendation.

**Implementing engineer:** Part II (data) → Part III (imaging) → Part IV (models) → Part VII (MATLAB/Simulink) → §59 Roadmap. Build in that order; the dependency chain is real.

**Reviewer probing for weakness:** §14 (sub-pixel claim), §8 (leakage), §25 (does the explanation actually help), §42 (ablation), §72 (risk register), §71 (defence Q&A).

# **Executive Summary**

India carries one of the largest diabetic populations in the world, and a large share of that population lives where an ophthalmologist does not. Diabetic retinopathy is asymptomatic until it is late, it is detectable from a photograph long before it is symptomatic, and it is treatable when caught early. That combination — silent, imageable, treatable, and under-screened — is exactly the shape of problem that machine vision is genuinely good at.

The engineering problem, though, is not "classify fundus images." That problem is largely solved on clean benchmark data and would not survive contact with a rural screening camp. The real problem is a chain of five coupled sub-problems, and the weakest link sets the value of the whole system:

1. **A photograph taken in a village PHC is often not gradeable at all.** A model that silently returns a confident grade on an unreadable image is worse than no model, because it manufactures false reassurance. Quality assessment is therefore the first component, not an afterthought.
2. **The lesions that matter earliest are tiny.** A microaneurysm can occupy a handful of pixels. Any design decision that destroys small-scale detail — aggressive downscaling, over-smoothing, careless enhancement — destroys the clinically earliest signal.
3. **The clinically decisive output is binary, not five-way.** "Refer or do not refer" is what changes a patient's day. Five-class severity is what the competition metric measures. These are different objectives and must be optimised and reported separately.
4. **An unexplained prediction cannot be safely acted upon.** An ophthalmologist reviewing 400 cases a day needs to agree or disagree in seconds. Explainability here is a throughput requirement, not a compliance checkbox.
5. **The bottleneck at district scale may not be the AI at all.** It may be cameras, bandwidth, recapture loops, or reviewer availability. This is a systems question, and it is the question Simulink exists to answer.

## **What we are proposing to build**

A **quality-gated, explainable, human-in-the-loop retinal screening pipeline implemented in MATLAB**, paired with a **SimEvents/Simulink discrete-event model of the district screening service** that turns measured component latencies into staffing and equipment answers.

FUNDUS IMAGE

|

v

\[1\] QUALITY GATE ------- Grade C (ungradeable) --> RECAPTURE (max 2 attempts)

| Grade A / B |

v after 2 fails

\[2\] ENHANCEMENT (Grade B only, conservative) --> flag "ungradeable",

| route to human

v

\[3\] ANATOMY: field mask, optic disc, fovea, vessel map

|

v

\[4\] LESION EVIDENCE: MA / haemorrhage / exudate candidate maps

|

v

\[5\] DR MODEL: ordinal CNN --> P(grade>=1..4), P(referable)=P(grade>=2)

|

v

\[6\] CALIBRATION + ABSTENTION: temperature-scaled; low confidence -> escalate

|

v

\[7\] EXPLANATION: Grad-CAM + lesion overlay + anatomical context + confidence

|

v

\[8\] REPORT --> \[9\] HUMAN REVIEW --> FINAL SCREENING DECISION

|

v

feedback captured for evaluation

_Figure 0.1 — The pipeline in one view. Numbered stages map to Parts III–V of this document._

## **The five decisions that define this design**

**Ordinal, not categorical.** The classifier head is a set of cumulative binary outputs P(grade ≥ k) rather than a flat 5-way softmax. DR severity is ordered, so a model that treats grade 0 and grade 4 as equally "different" from grade 2 is throwing away structure. Crucially, this makes **referable DR a directly optimised output** — P(grade ≥ 2) is a head, not a post-hoc aggregation. §19, §21.

**Quality is a gate, not a feature.** Images are routed by quality grade before they reach the model, and ungradeable images are refused rather than guessed at. The refusal rate is itself a reported metric. §9, §23.

**Explanation is layered, and Grad-CAM is the weakest layer.** We say this explicitly because it is true and because a judge will ask. Grad-CAM at the last convolutional block has a spatial resolution of roughly 16×16 for a 512-pixel input — approximately 32 pixels per cell, which is larger than a microaneurysm. Grad-CAM alone therefore cannot point at the earliest lesions. We pair it with an explicit, independently computed lesion evidence layer that can. §13, §24.

**Referable-DR threshold is chosen under a sensitivity constraint.** Not 0.5. We select the operating point that meets the ≥90% sensitivity requirement on validation data and then report whatever specificity that costs, with confidence intervals. Reporting the cost honestly is the point. §21.

**Simulink answers a question the AI cannot.** The model gives you milliseconds per image. The service question is "how many cameras, how many reviewers, how much bandwidth, and where does it jam?" That is a discrete-event queueing problem, and it is where Simulink earns its place in the architecture rather than decorating it. §36–§40.

## **The honest position on the stated performance targets**

The problem statement requires >90% sensitivity and >85% specificity for referable DR. Published work on public fundus datasets indicates this operating region is **reachable** for referable-DR detection on good-quality images. It does not follow that we will reach it, and it certainly does not follow that a number obtained on a held-out slice of APTOS transfers to a screening camp in a different district with a different camera.

So the blueprint commits to three things instead of one promise: **(a)** report the operating point under an explicit sensitivity constraint with bootstrap confidence intervals; **(b)** report it separately on internal test and on Messidor-2 as an external set the model never saw; **(c)** report the gap between those two numbers as a headline result rather than hiding it. A system that reports its own domain-shift penalty is more trustworthy than one that reports a single flattering number.

**The one-sentence thesis**

Explainable AI can make one ophthalmologist sufficient for a district — not by replacing clinical judgement, but by removing the images that do not need it and by making the remaining ones reviewable in seconds.

**PART I**

# **Problem Understanding and Clinical Foundation**

# **1\. First-Principles Analysis of the Problem**

Before any architecture is proposed, the problem is decomposed along nineteen independent axes. The purpose is to surface the constraints that will later kill naïve designs — and to find the places where the obvious solution is technically weak.

## **1.1 The core problem, stated precisely**

The naïve framing is: _classify fundus photographs into five DR grades._ This framing is wrong in three ways, and every one of them matters.

1. It assumes the input is a gradeable photograph. In a rural screening setting a substantial fraction of captures are not. A five-way classifier has no vocabulary for "I cannot see the retina."
2. It optimises the wrong objective. Nobody is treated on the basis of a grade; they are treated on the basis of a referral. The clinically decisive output is binary and asymmetric — a missed referral and a spurious referral have wildly different costs.
3. It assumes the constraint is accuracy. At district scale the binding constraint is far more likely to be _reviewer minutes per day_, and accuracy only helps insofar as it reduces reviewer minutes.

The corrected framing, which the rest of this document builds against:

**Core problem**

**Given a fundus photograph of unknown and often poor quality, produce either (a) a refusal with actionable recapture guidance, or (b) a calibrated referable/non-referable decision accompanied by evidence sufficient for a remote ophthalmologist to confirm or overturn it in under 30 seconds — at a throughput that lets a district of 100,000+ annual patients be served by the ophthalmologists that district actually has.**

## **1.2 Analysis across nineteen perspectives**

| **Perspective**          | **What it reveals**                                                                                                                                       | **Design consequence**                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clinical                 | DR is asymptomatic until late; earliest sign (microaneurysm) is sub-100 µm; grading uses the ICDR scale; the referral boundary sits at moderate NPDR.     | Small-lesion sensitivity governs early detection. Referral boundary (grade 1\|2) is the boundary that must be engineered hardest.                                     |
| AI/ML                    | ~3.6k labelled images is a _small_ dataset by modern standards. Training from scratch is not viable.                                                      | Transfer learning is mandatory, not a shortcut. Regularisation and augmentation budget matter more than architecture novelty.                                         |
| Computer vision          | Signal of interest is low-contrast, small-scale, and spatially sparse against a textured background.                                                      | Input resolution is a first-order hyperparameter — likely more important than backbone choice. Aggressive downscaling is a correctness bug, not a speed optimisation. |
| Medical image processing | Green channel carries the highest lesion/vessel contrast; illumination is radially non-uniform; the field of view is a circle inside a black rectangle.   | Field masking, illumination normalisation and green-channel work belong in preprocessing. Statistics computed over the black border are meaningless.                  |
| Deep learning            | Class distribution is severely skewed; labels are ordinal; label noise is known to exist in DR datasets.                                                  | Ordinal loss + class-aware sampling + label smoothing. Do not chase the last point of accuracy on noisy labels.                                                       |
| Explainable AI           | Last-block CAM resolution is coarser than the lesions of interest.                                                                                        | Explanation must be layered: CAM for region, explicit detection for lesion, anatomy for context. §24.                                                                 |
| MATLAB                   | Deep Learning Toolbox ships gradCAM, occlusionSensitivity, imageLIME; Image Processing Toolbox ships adapthisteq, fibermetric, morphology, imfindcircles. | The mandated stack is genuinely well-matched to this problem. This is an advantage to exploit, not a constraint to work around.                                       |
| Simulink                 | The service is a queueing network with rework loops (recapture) and a scarce server (ophthalmologist).                                                    | SimEvents is the correct modelling paradigm. Continuous-time Simulink alone would be the wrong tool.                                                                  |
| Rural healthcare         | Operators are technicians, not clinicians. Retakes cost patient time and patients leave.                                                                  | Quality feedback must be immediate and instructive ("too dark, reduce ambient light"), not a score.                                                                   |
| Telemedicine             | Review is asynchronous and remote; the reviewer sees only what we transmit.                                                                               | The transmitted package — not the local UI — is the real product surface.                                                                                             |
| Edge / offline           | Connectivity is intermittent and asymmetric (uplink far worse than downlink).                                                                             | Inference must be local. Upload is store-and-forward and selective. §31, §32.                                                                                         |
| Data engineering         | Four datasets, four label schemas, four camera populations, no shared patient identifiers.                                                                | Datasets must be role-separated, not merged. §7.                                                                                                                      |
| MLOps                    | Small team, hackathon timescale, but a system claiming clinical relevance.                                                                                | Reproducibility and versioning are in scope. Kubernetes and feature stores are not. §57, §64.                                                                         |
| Software architecture    | One monolithic script cannot be tested, and an untestable pipeline cannot be validated.                                                                   | Function/class decomposition with matlab.unittest from Phase 1. §29, §55.                                                                                             |
| Security                 | Retinal images plus demographics are sensitive health data.                                                                                               | Encryption at rest and in transit, access control, immutable audit log. §52, §53.                                                                                     |
| Reliability              | Failure of any stage must degrade to "human decides", never to "system guesses".                                                                          | Fail-safe default is escalation. §28, §54.                                                                                                                            |
| Scalability              | Target is 100,000+ patients/year across a district.                                                                                                       | Scale is achieved by adding screening sites, not by adding software tiers. §37.                                                                                       |
| Human-in-the-loop        | The ophthalmologist is the scarcest resource in the entire system.                                                                                        | Every design decision is measured by its effect on reviewer seconds per patient.                                                                                      |
| Cost                     | Portable fundus cameras and technician time dominate; compute is nearly free by comparison.                                                               | Do not optimise GPU cost. Optimise recapture rate and reviewer load. §56.                                                                                             |

_Table 1.1 — Multi-perspective decomposition. Each row constrains the architecture that follows._

## **1.3 Hidden complexity**

Five things are harder than they look, and a design that does not acknowledge them will fail during integration rather than during design review.

**The 0|1 boundary is nearly unlearnable and nearly irrelevant.** Distinguishing "no DR" from "mild NPDR" means detecting the presence of _at least one_ microaneurysm across a wide field. Human graders disagree here. Fortunately both classes are non-referable, so errors on this boundary cost almost nothing clinically — but they cost a great deal of QWK. This tension must be managed deliberately, not accidentally.

**Enhancement can delete the disease.** Denoising, aggressive CLAHE and JPEG re-encoding all attack exactly the low-contrast, few-pixel structures we need. Enhancement must be validated _against lesion preservation_, not against how good the image looks. §10.

**Quality and severity are confounded.** Severe disease can itself darken and obscure the retina (vitreous haemorrhage, media opacity from cataract co-morbidity). A quality model trained carelessly may learn to call sick eyes "ungradeable", which is precisely backwards. §9.6.

**Grad-CAM will sometimes look right for the wrong reason.** A CAM that highlights the optic disc on a PDR case may reflect genuine neovascularisation of the disc, or may reflect the network anchoring on the brightest object in every image. Distinguishing these requires a perturbation test, not a screenshot. §25.

**The recapture loop is a feedback system and can oscillate.** If quality thresholds are tight and technicians are inexperienced, recapture rate rises, throughput collapses, and queue time explodes non-linearly. This is a control problem, which is exactly why it belongs in Simulink. §36.

## **1.4 Where the obvious solution is technically weak — and what replaces it**

| **Obvious approach**                                                      | **Why it is weak**                                                                                                                                                 | **What this blueprint does instead**                                                                                                                                             |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single 5-class softmax CNN on APTOS                                       | Ignores ordinality; referable DR becomes a post-hoc sum of probabilities that was never optimised; no abstention.                                                  | Cumulative-link ordinal head. P(referable) = P(grade ≥ 2) is a first-class, directly supervised output. §19.                                                                     |
| Merge all four datasets to "get more data"                                | Different grading schemas, different cameras, different resolutions. Merging contaminates external validation and creates label noise that looks like model error. | Strict role separation: APTOS trains, IDRiD supervises lesions and validates explanations, DRIVE validates vessels, Messidor-2 is untouched until final external validation. §7. |
| Resize everything to 224×224 because that is what ImageNet used           | Destroys microaneurysms. A 4288-pixel-wide image downscaled to 224 gives ~19× reduction; a 50-µm lesion vanishes.                                                  | Train at 512² minimum; evaluate resolution as a hyperparameter with a documented ablation. §16.4.                                                                                |
| Use Grad-CAM as "the explainability feature"                              | Resolution mismatch with the lesions; no validation that it aids a reviewer.                                                                                       | Three-layer explanation (CAM + lesion evidence + anatomy) with a measured localisation and reviewer-time protocol. §24, §25.                                                     |
| Claim sub-pixel microaneurysm detection because the PS mentions precision | Not physically justifiable from the available imagery. Interpolation does not create information.                                                                  | Reframed as sub-pixel _centroid estimation on already-detected candidates_, with the limitation stated in the open. §14.                                                         |
| Build a microservice architecture with a queue broker                     | A screening site is one laptop. Distributed infrastructure adds failure modes and zero capability.                                                                 | Single-process MATLAB pipeline + SQLite + filesystem at the edge; the "distributed system" is the _human_ telemedicine network, simulated in Simulink. §29, §64.                 |
| Report accuracy                                                           | Accuracy is dominated by grade 0 and is nearly uninformative here.                                                                                                 | QWK for the ordinal task, sensitivity/specificity at a constrained operating point for the clinical task, plus calibration. §20.                                                 |

_Table 1.2 — Rejected defaults and their replacements. Each replacement is defended in the referenced section._

## **1.5 Assumptions register**

Every assumption below is a place where the design could be wrong. Each has a stated verification route.

| **#** | **Assumption**                                                                                                                                           | **Status**                                                      | **How it gets verified**                                               |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| A1    | APTOS training labels (≈3,662 images) are the only labelled DR-graded data we control for the primary task; the ≈1,928 APTOS test images are unlabelled. | High confidence — **to be verified** against train.csv in hand. | Count rows in train.csv; confirm no label file exists for test_images. |
| A2    | No patient-level identifier is available in APTOS, so fellow eyes of the same patient may straddle a train/test split.                                   | Likely true — **to be verified**.                               | Inspect metadata columns; run near-duplicate detection (§8.4).         |
| A3    | Referable-DR prevalence in a rural screened population is in the 10–20% band.                                                                            | **ASSUMPTION** — used only for capacity modelling.              | Sensitivity-analysed across 5–25% in Simulink scenarios (§40).         |
| A4    | A trained technician can capture a usable macula-centred image in ≈5–8 minutes per patient including registration.                                       | **ASSUMPTION**.                                                 | Measured during any field pilot; swept in Simulink.                    |
| A5    | An ophthalmologist can adjudicate an AI-explained case in ≈30 s (the PS target).                                                                         | **REQUIRED** target, treated as **ASSUMPTION** for modelling.   | Timed reviewer study, §25.4.                                           |
| A6    | Target edge hardware is a mid-range laptop, GPU optional.                                                                                                | **ASSUMPTION** driven by rural procurement reality.             | Benchmark suite on CPU-only and GPU configurations (§33).              |
| A7    | Rural uplink is intermittent, and when present is in the 0.25–2 Mbps band.                                                                               | **ASSUMPTION**.                                                 | Swept in Simulink Scenario B (§40).                                    |

_Table 1.3 — Assumption register. A1 and A2 are the two that most affect scientific validity; A3–A7 affect capacity conclusions only._

# **2\. Problem Statement and Requirement Decomposition**

The problem statement names five capability areas and eight expected demonstrations. This section converts them into testable requirements with explicit verification methods — because "the system does explainability" is not something you can pass or fail.

## **2.1 The five mandated capability areas**

1. **Image Quality Assessment and Enhancement** — detect unusable captures, improve borderline ones, refuse the rest.
2. **Retinal Structure Segmentation** — optic disc, fovea/macula, vessel network, retinal field.
3. **DR Severity Grading** — five-class ICDR-aligned grading plus the referable/non-referable clinical decision.
4. **Explainability** — evidence a clinician can act on, not a heatmap for a slide.
5. **Simulink Workflow Simulation** — telemedicine and resource modelling at district scale.

## **2.2 Requirements, restated as verifiable statements**

| **ID** | **Requirement**                                                       | **Class**            | **Verification method**                                                                                                                                                    |
| ------ | --------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-01   | System classifies fundus images into ICDR grades 0–4.                 | REQUIRED             | Confusion matrix + per-class recall on held-out APTOS split.                                                                                                               |
| R-02   | Referable-DR sensitivity > 90%.                                       | REQUIRED             | Operating point selected on validation under sensitivity constraint; reported on internal test **and** Messidor-2 with bootstrap 95% CI.                                   |
| R-03   | Referable-DR specificity > 85%.                                       | REQUIRED             | Reported at the same operating point as R-02. If both cannot be met simultaneously, the achievable frontier is reported as an ROC curve with the shortfall stated plainly. |
| R-04   | Grad-CAM outputs are produced and are explainable.                    | REQUIRED             | Generated for 100% of graded cases; localisation measured against IDRiD lesion masks (§25.2); stability measured under perturbation (§25.3).                               |
| R-05   | Output constitutes clinically useful evidence.                        | REQUIRED             | Reviewer-time and reviewer-agreement study, §25.4. This is the requirement most projects assert and never measure.                                                         |
| R-06   | Simulink models the screening workflow and resource allocation.       | REQUIRED             | Seven executable scenarios (§40) producing staffing/equipment recommendations with sensitivity bands.                                                                      |
| R-07   | Validation against published benchmarks.                              | REQUIRED             | Our metrics placed alongside published ranges, with an explicit note on protocol differences that make comparison imperfect (§42).                                         |
| R-08   | Integrated-pipeline performance analysis.                             | REQUIRED             | Five-arm ablation study (§42): does quality gating + anatomy + lesion evidence actually beat a bare classifier? Reported even if the answer is no.                         |
| R-09   | Ungradeable images are refused rather than graded.                    | DERIVED (safety)     | Refusal rate reported; zero grades emitted on Grade-C images by construction.                                                                                              |
| R-10   | Low-confidence predictions abstain and escalate.                      | DERIVED (safety)     | Abstention rate + post-abstention reviewer agreement.                                                                                                                      |
| R-11   | Predicted probabilities are calibrated.                               | DERIVED              | Reliability diagram, Expected Calibration Error, Brier score before and after temperature scaling.                                                                         |
| R-12   | End-to-end inference runs offline on a single machine.                | DERIVED (deployment) | Airplane-mode end-to-end test; §32.                                                                                                                                        |
| R-13   | Every decision is auditable to a model version and a dataset version. | DERIVED (governance) | Audit record schema §45; spot-check reproduction of an archived case.                                                                                                      |

_Table 2.1 — Requirements traceability. R-05 and R-08 are the two that separate a serious project from a demo._

**On R-02 and R-03 together**

Sensitivity and specificity are not independent knobs. They trade along a single ROC curve, and demanding both ≥90% and ≥85% simultaneously is a demand about the _quality of the curve_, not about threshold choice.

The professional response is: pick the threshold that satisfies the harder constraint (sensitivity, because false negatives blind people), report the specificity that results, and — if it falls short of 85% — say so, quantify the referral-load consequence in the Simulink model, and show the ablation that would close the gap. That is a stronger answer than a suspiciously convenient number.

## **2.3 Explicit non-goals**

Scope discipline is a design feature. The following are **out of scope** and saying so protects the parts that matter.

- Autonomous diagnosis without human review — deliberately excluded on safety grounds (§28, ADR-14).
- Diabetic macular oedema (DME) grading — APTOS provides no DME labels. IDRiD does, which makes DME a **V2 candidate**, not an MVP claim. Stating this prevents an easy and damaging overclaim.
- Other retinal pathology (glaucoma, AMD, hypertensive retinopathy) — out of distribution. The system must not be represented as a general eye-screening tool.
- OCT, fluorescein angiography, or any modality other than colour fundus photography.
- Regulatory submission artefacts (IEC 62304 lifecycle records, CDSCO dossier). We design so as not to preclude them; we do not claim them.
- Treatment recommendation of any kind. The system outputs a referral triage level, never a therapy.

# **3\. Product Vision**

## **3.1 What the system is**

**RetinaGuard** (working name) is a point-of-care screening assistant for peripheral health facilities and mobile screening camps. It sits between a portable fundus camera and a remote ophthalmologist, and its job is to make the ophthalmologist's scarce attention land where it matters.

It performs three functions in sequence: it **refuses** unusable images while the patient is still in the chair; it **triages** usable images into referable / non-referable with a calibrated confidence; and it **explains** each triage decision well enough that a remote reviewer can confirm or overturn it quickly.

## **3.2 What the system is not**

**Positioning statement**

An AI-assisted screening and triage system — **not** an autonomous replacement for ophthalmologists. Every patient-affecting decision is made by a human. The AI decides only what the human looks at first.

- Not a diagnostic device. It produces a screening recommendation and supporting evidence.
- Not a replacement for dilated fundus examination where that is clinically indicated.
- Not validated for clinical use. It is a prototype with measured benchmark performance.
- Not a general ophthalmic screening tool — it looks for DR and nothing else.

## **3.3 Users and their actual jobs**

| **User**                                    | **Environment**                                         | **What they need from the system**                                                                                                                                 | **What would make them abandon it**                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Screening technician / ophthalmic assistant | PHC room or camp tent, variable lighting, queue outside | Instant, _instructive_ quality verdict ("too dark — dim the room lamp"), not a score. Confidence they can move to the next patient.                                | Slow feedback; vague rejections; a recapture loop with no guidance.                                                                          |
| Remote ophthalmologist                      | District hospital, reviewing in batches between clinics | A package they can adjudicate in seconds: original image, evidence overlay, confidence, and a one-line rationale. Priority ordering so urgent cases surface first. | Being shown 400 undifferentiated cases; heatmaps that do not correspond to anything; being asked to review cases the AI was confident about. |
| District programme manager                  | Administrative, monthly reporting                       | Coverage, referral volume, backlog, and where the bottleneck is this month.                                                                                        | Dashboards of model metrics they cannot act on.                                                                                              |
| Patient                                     | Rural, may have travelled hours, may not return         | A decision the same day, or a clear next step.                                                                                                                     | Being asked to come back because "the photo did not work" with no explanation.                                                               |
| Engineering / QA team                       | Development and monitoring                              | Reproducibility, drift signals, audit trail.                                                                                                                       | Silent model changes; unversioned preprocessing.                                                                                             |

_Table 3.1 — The right-hand column is the design brief. Most screening AI fails on it, not on accuracy._

## **3.4 Why each pillar is necessary**

**Why automation.** The arithmetic is unforgiving. At 400 patients/day and roughly 3 minutes of manual grading per patient, a district needs on the order of 20 ophthalmologist-hours per day purely for grading — before a single patient is treated. Districts do not have that. Automation is not an efficiency play here; it is the difference between a programme existing and not existing.

**Why explainability.** A reviewer who must independently re-read every image gains nothing from the AI. The 30-second review target is only achievable if the system shows _where_ and _why_. Explainability is therefore load-bearing for throughput, and throughput is load-bearing for coverage.

**Why image-quality assessment.** It is the only component that protects against the system's most dangerous failure: a confident normal grade on an image where the retina was never visible. Quality assessment converts a silent false negative into an actionable recapture.

**Why human review remains.** Three reasons, in order of weight. Safety: a false negative may cost sight. Distribution: the deployment population differs from the training population in ways the model cannot know. Accountability: a clinical decision needs a clinician attached to it.

## **3.5 How the system supports rather than displaces ophthalmologists**

WITHOUT AI (per 400-patient screening day)

Ophthalmologist reads 400 images x ~3 min = ~20.0 h/day

\--> ~2.5 full-time ophthalmologists just for grading

WITH AI, "review everything" policy (safety-first, Year 1)

Ophthalmologist adjudicates 400 explained cases x 30 s = ~3.3 h/day

\--> ~0.4 FTE \[TARGET, contingent on the 30 s figure holding\]

WITH AI, "review positives + uncertain + audit sample" (Year 2+)

~20% flagged + ~5% uncertain + 5% random audit = ~120 cases x 45 s = ~1.5 h/day

\--> ~0.2 FTE

All figures ASSUMPTION-based; see A3-A5. The point is the ratio,

not the decimal. AI converts an impossible staffing requirement

into a feasible one WITHOUT removing the clinician.

_Figure 3.1 — The value proposition in arithmetic. This calculation is re-derived from measured latencies in §37._

## **3.6 Scaling path: prototype to district**

| **Stage**       | **Footprint**                                 | **What changes**                                                                  | **What deliberately does not**                                                                                  |
| --------------- | --------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Prototype (SIH) | 1 laptop, offline, sample images              | Nothing — this is the reference implementation.                                   | —                                                                                                               |
| Pilot           | 1–3 PHCs + 1 reviewer, store-and-forward sync | Add SQLite case store, sync daemon, reviewer web view.                            | Model, pipeline and MATLAB core are unchanged.                                                                  |
| District        | 10–20 sites, 1 district server, 1–2 reviewers | Add PostgreSQL + object storage at the district node; priority queue; dashboards. | Inference stays at the edge. No cloud dependency introduced.                                                    |
| Multi-district  | N districts, shared model registry            | Centralised model versioning and drift monitoring; per-district calibration.      | Still no microservices. Scaling is horizontal replication of a simple node, not decomposition of a complex one. |

_Table 3.2 — The scaling story is "add more identical nodes", which is why the architecture can stay simple. §64._

# **4\. Clinical Problem Analysis**

**Scope of clinical content**

This section covers only what is needed to engineer the system correctly. Clinical facts stated here are standard ophthalmology; anything dataset-dependent or uncertain is marked. This is not medical guidance and must not be used as such.

## **4.1 What diabetic retinopathy is**

Diabetic retinopathy is a **microvascular complication of diabetes**: chronic hyperglycaemia damages the small blood vessels of the retina. The damage progresses through a non-proliferative phase, in which vessels leak and close off, into a proliferative phase, in which the ischaemic retina grows fragile new vessels that can bleed into the vitreous or contract and detach the retina.

Two properties make it an unusually good target for imaging-based screening. First, it is **asymptomatic in its early and mid stages** — patients do not know they have it, so they do not present. Second, the retina is the **only place in the body where microvasculature can be photographed non-invasively**, so the disease is directly visible long before it is felt.

## **4.2 The lesions that matter, and what they mean for computer vision**

| **Lesion**                            | **Clinical meaning**                                                                               | **Appearance**                                                                                          | **CV difficulty**                                                                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Microaneurysm (MA)**                | Earliest reliably visible sign. Outpouching of a capillary wall. Presence alone defines mild NPDR. | Small, round, sharply-bordered red dot; on the order of tens of micrometres.                            | **Hardest.** A few pixels across, low contrast against retinal background, easily confused with a vessel cross-section or a dust artefact. Detection is resolution-limited. |
| **Dot / blot haemorrhage**            | Deeper intraretinal bleeding. Counts and quadrant distribution drive the severe-NPDR criteria.     | Red, larger and more irregular than an MA; blots are round and deep, flame-shaped ones are superficial. | Moderate. Confusable with MAs at the small end (the MA/dot-haemorrhage boundary is genuinely fuzzy) and with vessel segments.                                               |
| **Hard exudate**                      | Lipid/protein deposited from leaking vessels. Near the fovea it signals oedema risk.               | Bright yellow-white, sharply defined, often clustered or in rings.                                      | Moderate. Main confounder is the **optic disc**, which is also bright and sharply bounded — and much larger. Requires disc masking.                                         |
| **Cotton-wool spot (soft exudate)**   | Nerve-fibre-layer infarct — a marker of ischaemia.                                                 | Pale, fluffy, indistinct borders.                                                                       | Moderate. Distinguished from hard exudates mainly by border sharpness and texture.                                                                                          |
| **Venous beading / IRMA**             | Markers of advanced ischaemia; part of the severe-NPDR "4-2-1" criteria.                           | Beading: irregular calibre along a vein. IRMA: abnormal tortuous intraretinal vessels.                  | **Very hard.** Requires accurate vessel segmentation _plus_ calibre profiling along the centreline. Realistically a V2 research target.                                     |
| **Neovascularisation (NVD/NVE)**      | Defines proliferative DR. Sight-threatening.                                                       | Fine, tortuous, chaotic new vessel networks at the disc or elsewhere.                                   | **Very hard** at typical screening resolution. Fine calibre and low contrast. High-quality imagery is a precondition, not a nice-to-have.                                   |
| **Preretinal / vitreous haemorrhage** | Advanced PDR. Also degrades the image itself.                                                      | Large dark obscuration, sometimes with a fluid level.                                                   | Creates the quality/severity confound of §1.3 — the sickest eyes can look like the worst photographs.                                                                       |

_Table 4.1 — Lesion taxonomy with engineering annotations. The right-hand column drives the MVP scoping in §13._

## **4.3 Why anatomy must be located**

- **Optic disc.** It is bright, round, and sharply bounded — which is to say it is a very effective false-positive generator for any bright-lesion detector. Masking it is the single highest-yield precision improvement in exudate detection. It is also the site of NVD.
- **Fovea / macula.** The centre of vision. Lesion proximity to the fovea changes urgency substantially, and macular involvement is the main driver of vision loss. Even without DME labels, fovea-relative lesion position is valuable _report_ content.
- **Vessel network.** Doubles as a confounder to be suppressed (vessel cross-sections mimic MAs) and as a signal to be read (beading, NVE, tortuosity). Also an excellent quality proxy: if fine vessels are not resolvable, the image cannot support MA detection.
- **Retinal field boundary.** The circular field of view inside the black frame. Every intensity statistic computed without this mask is contaminated by background, and every CLAHE tile that straddles the edge produces a halo artefact.

## **4.4 Why this problem is statistically hard**

**Class imbalance is severe and structured.** Grade 0 dominates; grades 1 and 3 are scarce. A model that predicts "0" constantly scores well on accuracy and is worthless. Worse, the scarce grades are not scarce at random — grade 3 (severe NPDR) is defined by criteria that are hard to photograph and hard to grade, so it is both rare _and_ noisy.

**Labels contain real noise.** Inter-grader agreement on DR severity is imperfect even among specialists, and public datasets are typically single-grader. Above a certain point, "improving" the model means fitting the grader, not the disease. This bounds achievable QWK and should be stated rather than fought.

**The signal is spatially sparse.** A few dozen pixels of lesion inside several million pixels of image. Global pooling averages the evidence away. This argues for higher input resolution and for lesion-aware architectures.

**False negatives and false positives are asymmetric.** A false negative means untreated progressive disease in someone who believed they were cleared, and who may not be screened again for a year. A false positive means a wasted referral slot. These are not comparable, and the loss function, threshold, and abstention policy must all reflect that.

**But false positives are not free either.** Referral capacity is the constraint that determines whether the programme is sustainable. A system at 99% sensitivity and 40% specificity would refer more than half the district and collapse the very service it was meant to enable. §21.4.

# **5\. Clinical Severity Model and Prediction Objectives**

## **5.1 The grading scale**

The dataset labels align with the **International Clinical Diabetic Retinopathy (ICDR) severity scale**, a five-level ordinal scale. The clinical definitions below explain what the levels _mean_; the model is trained against dataset labels, which are an imperfect realisation of these definitions.

| **Level** | **Name**         | **Clinical basis (ICDR)**                                                                                                                                                                        | **Screening action**                    | **Referable?**   |
| --------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ---------------- |
| **0**     | No apparent DR   | No visible abnormalities.                                                                                                                                                                        | Routine annual rescreen.                | No               |
| **1**     | Mild NPDR        | Microaneurysms only.                                                                                                                                                                             | Rescreen; typically 6–12 months.        | No               |
| **2**     | Moderate NPDR    | More than microaneurysms alone, but short of the severe criteria.                                                                                                                                | Refer for ophthalmic assessment.        | **Yes**          |
| **3**     | Severe NPDR      | The "4-2-1" rule: extensive intraretinal haemorrhages in all four quadrants, **or** definite venous beading in ≥2 quadrants, **or** prominent IRMA in ≥1 quadrant — with no proliferative signs. | Prompt referral; high progression risk. | **Yes**          |
| **4**     | Proliferative DR | Neovascularisation and/or vitreous or preretinal haemorrhage.                                                                                                                                    | Urgent referral. Sight-threatening.     | **Yes (urgent)** |

_Table 5.1 — ICDR levels. The referral boundary sits between level 1 and level 2 — which is why that boundary receives disproportionate engineering attention._

## **5.2 Two objectives, evaluated independently**

### **Objective A — five-class ordinal severity**

Predict a grade in {0,1,2,3,4}. Primary metric: **Quadratic Weighted Kappa**, matching the APTOS evaluation protocol. Secondary: per-class recall, macro-F1, full confusion matrix.

### **Objective B — referable DR (the clinical objective)**

Binary: grade ≥ 2 → refer. Primary metrics: **sensitivity and specificity at a threshold chosen under a sensitivity constraint**, plus ROC-AUC, PR-AUC, PPV, NPV, and the false-negative count in absolute terms.

**Why these must not be conflated**

Strong five-class QWK does **not** imply strong referable-DR screening. QWK rewards getting near the right grade; it is dominated by the large, easy grade-0 population and by the clinically inconsequential 0|1 boundary. A model can post a respectable QWK while systematically leaking grade-2 cases into grade 1 — which is precisely the failure that matters most.

Conversely, a model tuned hard for referable sensitivity may collapse grades 2, 3 and 4 together and score poorly on QWK while being clinically better.

The blueprint therefore reports both, optimises the ordinal head jointly, and **selects the deployment threshold on Objective B alone**.

## **5.3 The label boundary that decides everything**

grade: 0 ------- 1 ||||||| 2 ------- 3 ------- 4

^^^^^^^^

REFERRAL BOUNDARY

Boundary Clinical cost of error Difficulty Engineering priority

\--------- --------------------------- ---------- --------------------

0 | 1 Near zero (both non-refer) Very high LOW - accept errors

1 | 2 HIGHEST - missed referral High \*\*MAXIMUM\*\*

2 | 3 Low (both referred; urgency) Moderate Medium

3 | 4 Low (both referred; urgency) Moderate Medium

Consequence: error analysis, loss weighting, threshold selection and

reviewer sampling are all concentrated on the 1|2 boundary. Effort spent

perfecting 0|1 buys QWK and buys almost no clinical value.

_Figure 5.1 — Not all confusions are equal. This asymmetry drives §19, §21, §28 and §44._

## **5.4 Urgency stratification within "referable"**

Referable is not one thing. A grade-4 case needs to be seen within days; a grade-2 case within weeks. Since the ordinal head already yields P(grade ≥ 3) and P(grade ≥ 4) for free, the system emits a three-level triage priority at no additional modelling cost — and this priority is what orders the ophthalmologist's queue in the Simulink model (§36) and in deployment (§39).

| **Triage level**       | **Trigger**                                                                              | **Queue behaviour**                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **P1 — Urgent**        | P(grade ≥ 4) above threshold, or explicit neovascularisation/large-haemorrhage evidence. | Jumps the queue. Target adjudication same day.                                                       |
| **P2 — Refer**         | P(grade ≥ 2) above threshold, not P1.                                                    | Standard referral queue.                                                                             |
| **P3 — Rescreen**      | Below referral threshold, confident.                                                     | Auto-cleared with audit sampling; no reviewer time unless sampled.                                   |
| **P0 — Cannot assess** | Grade C quality after retries, or abstention on low confidence.                          | Routed to reviewer with the original image and the reason for abstention. **Never** silently graded. |

_Table 5.2 — Triage output. P0 is the safety-critical class and is deliberately never merged into P3._

**PART II**

# **Data Strategy and Governance**

# **6\. Dataset Strategy**

Four datasets are named in the problem statement. They are not four sources of the same thing. They differ in grading schema, camera population, resolution, annotation type and geography — and treating them as interchangeable is the fastest way to produce a model that scores well and means nothing.

**Verification discipline**

Dataset properties below are stated to the best of current knowledge and marked **TO BE VERIFIED** where they must be confirmed against the actual release in hand before any experiment is run. Counting the files and reading the label CSV is a Phase 1 task, not an assumption. Invented dataset properties are a category of error that destroys credibility instantly.

## **6.1 Dataset profiles**

### **APTOS 2019 Blindness Detection**

| **Property**                    | **Value**                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primary purpose here            | **Primary training and internal evaluation set for DR severity grading.**                                                                                                      |
| Source                          | Aravind Eye Hospital, India — rural screening context, which makes it unusually well-matched to this problem statement.                                                        |
| Labels                          | Single DR severity grade per image, 0–4, ICDR-aligned.                                                                                                                         |
| Labelled volume                 | ≈3,662 images with published labels (train.csv). **TO BE VERIFIED** by row count.                                                                                              |
| Unlabelled volume               | ≈1,928 images in test_images with **no public labels** — competition ground truth was never released. **TO BE VERIFIED.**                                                      |
| Image characteristics           | Highly variable: differing resolutions, aspect ratios, illumination, colour balance, and degrees of blur/artefact. Multiple capture sites and conditions.                      |
| Lesion annotations              | None.                                                                                                                                                                          |
| Vessel annotations              | None.                                                                                                                                                                          |
| Evaluation metric               | Quadratic Weighted Kappa.                                                                                                                                                      |
| Training suitability            | **High** — it is the only named set with enough graded images to train a modern classifier.                                                                                    |
| Internal validation suitability | High, provided splits are constructed carefully (§8).                                                                                                                          |
| External validation suitability | **None** — it is the training distribution.                                                                                                                                    |
| Known limitations               | Single-grader labels (noise); no patient identifiers; class imbalance; heterogeneous quality — though that heterogeneity is arguably a _feature_ for a rural-deployment model. |

**The single most important data fact in this project**

The ≈1,928 APTOS test images are **unlabelled**. They cannot produce a single measured accuracy, sensitivity, specificity or QWK number.

They are still valuable — but only for label-free purposes: quality-distribution analysis, prediction-distribution monitoring, drift-detection rehearsal, throughput benchmarking, and demo material. Any claim of "we evaluated on the APTOS test set" would be false unless labels were obtained independently.

All measured supervised results therefore come from splits of the ≈3,662 labelled images, plus Messidor-2 for external validation.

### **IDRiD — Indian Diabetic Retinopathy Image Dataset**

| **Property**                    | **Value**                                                                                                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary purpose here            | **Lesion supervision and explainability validation.** This is the dataset that lets us claim our heatmaps point at real lesions rather than at plausible-looking texture.                                            |
| Source                          | Eye clinic in Nanded, Maharashtra, India. **TO BE VERIFIED.**                                                                                                                                                        |
| Sub-tasks                       | Segmentation (pixel-level lesion masks), Disease Grading (DR grade + DME risk grade), Localisation (optic disc and fovea centre coordinates). **TO BE VERIFIED.**                                                    |
| Lesion annotations              | Pixel-level masks for microaneurysms, haemorrhages, hard exudates and soft exudates, plus optic disc. This is the critical asset. Segmentation subset is small — on the order of tens of images. **TO BE VERIFIED.** |
| Image characteristics           | High resolution (≈4288×2848), ≈50° field of view, consistent single-camera capture. **TO BE VERIFIED.**                                                                                                              |
| Training suitability            | For lesion segmentation: usable but small — heavy patch-based augmentation required. For DR grading: too small to train on alone, and merging it with APTOS is discouraged (§7.2).                                   |
| External validation suitability | Moderate for grading. **Primary** for lesion localisation and explanation validation.                                                                                                                                |
| Known limitations               | Single-centre, single-camera — cleaner and more uniform than field conditions. Small segmentation subset. DME grades exist but DME is out of MVP scope (§2.3).                                                       |

### **DRIVE — Digital Retinal Images for Vessel Extraction**

| **Property**           | **Value**                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primary purpose here   | **Vessel segmentation training and validation only.** Nothing else.                                                                                                                                          |
| Source                 | Dutch diabetic retinopathy screening programme. **TO BE VERIFIED.**                                                                                                                                          |
| Volume                 | 40 images, split 20 train / 20 test. Test set has two independent manual segmentations, which is useful as a human-agreement ceiling. **TO BE VERIFIED.**                                                    |
| Image characteristics  | Low resolution by modern standards (≈565×584), ≈45° FOV. **TO BE VERIFIED.**                                                                                                                                 |
| Annotations            | Pixel-level vessel masks + field-of-view masks.                                                                                                                                                              |
| DR grading suitability | **None.** No usable DR severity labels; only a small minority of images show any DR at all.                                                                                                                  |
| Domain difference      | Substantial — European population, different camera, far lower resolution than APTOS or IDRiD. A vessel model trained on DRIVE and applied to 4288-pixel APTOS images without scale normalisation will fail. |
| Known limitations      | Tiny. Old. Resolution mismatch is the dominant practical problem and must be handled by matching _vessel-width-in-pixels_, not image size (§12.4).                                                           |

### **Messidor-2**

| **Property**                 | **Value**                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary purpose here         | **External validation. Locked until Phase 9.**                                                                                                                                                                                                                                                                                                           |
| Source                       | French ophthalmology departments. **TO BE VERIFIED.**                                                                                                                                                                                                                                                                                                    |
| Volume                       | ≈1,748 images from ≈874 examinations — two images (one per eye) per subject. **TO BE VERIFIED.**                                                                                                                                                                                                                                                         |
| Critical structural property | **Subject-level pairing is explicit.** Both eyes of a subject are present and identifiable. Any split of Messidor-2 must be by subject, never by image.                                                                                                                                                                                                  |
| Label caveat                 | The original Messidor grading scheme (R0–R3, based on MA/haemorrhage counts and neovascularisation) is **not** the ICDR 0–4 scale. Adjudicated ICDR-style grades for Messidor-2 exist from later annotation efforts. **The exact label file and its provenance must be verified before use**, and the mapping applied must be documented in the results. |
| Domain difference            | European population, different cameras, different acquisition protocol. This is exactly what makes it valuable — it is a genuine domain shift, not a re-slice of the training distribution.                                                                                                                                                              |
| Known limitations            | Label provenance is the main risk. Reporting an external-validation number against a grading scheme that does not align with training labels is worse than reporting nothing.                                                                                                                                                                            |

## **6.2 What each dataset is actually for — one table**

| **Dataset**                   | **Train grading** | **Train lesions** | **Train vessels** | **Internal val** | **External val** | **Explanation val**               |
| ----------------------------- | ----------------- | ----------------- | ----------------- | ---------------- | ---------------- | --------------------------------- |
| APTOS 2019 (labelled)         | **PRIMARY**       | no labels         | no labels         | **PRIMARY**      | never            | no                                |
| APTOS 2019 (test, unlabelled) | no                | no                | no                | no               | no               | no — _label-free monitoring only_ |
| IDRiD                         | no _(see §7.2)_   | **PRIMARY**       | no                | no               | secondary        | **PRIMARY**                       |
| DRIVE                         | no                | no                | **PRIMARY**       | no               | no               | indirect                          |
| Messidor-2                    | **never**         | no                | no                | **never**        | **PRIMARY**      | no                                |

_Table 6.1 — The role matrix. The two "never" entries for Messidor-2 are the ones that keep external validation honest._

## **6.3 Class distribution and what it implies**

The APTOS labelled set is strongly imbalanced. Approximate distribution (**TO BE VERIFIED** by reading train.csv — this must be recomputed, never quoted):

Grade Name approx n approx % Referable?

\----- ---------------- -------- -------- ----------

0 No DR ~1805 ~49.3% No ---+

1 Mild NPDR ~370 ~10.1% No ---+--> ~59.4%

2 Moderate NPDR ~999 ~27.3% YES ---+

3 Severe NPDR ~193 ~5.3% YES ---+--> ~40.6%

4 Proliferative DR ~295 ~8.1% YES ---+

\-------

total ~3662

**A non-obvious and useful observation**

The **five-class** task is badly imbalanced: grade 3 has roughly one-tenth the support of grade 0, and grades 1 and 3 together are barely 15% of the data.

The **referable** task is not. At roughly 41% positive versus 59% negative, the binary clinical task is close to balanced.

This changes the engineering plan. Heavy imbalance machinery — focal loss, aggressive resampling — is aimed at the five-class objective. The clinically decisive objective needs threshold engineering and calibration far more than it needs rebalancing. Applying imbalance corrections indiscriminately to the binary task would distort its calibration for no benefit. §19.

# **7\. Dataset Role Separation**

The instinct to concatenate everything is strong and wrong. This section states exactly what may be combined, what may not, and why.

## **7.1 The separation rules**

| **Rule** | **Statement**                                                                                                                  | **Rationale**                                                                                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1**   | Messidor-2 is not opened, inspected, tuned against or looked at until Phase 9.                                                 | The instant it informs any decision — architecture, threshold, augmentation — it stops being external validation and becomes a second validation set. There is no way to undo this.                                             |
| **S2**   | IDRiD grading labels are not merged into the APTOS training pool for the MVP.                                                  | Different centre, different camera, different grader. Adds ~500 images (≈14%) while introducing a second label distribution. Poor risk/reward. Reconsider in V1 with a domain-adaptation experiment that _measures_ the effect. |
| **S3**   | IDRiD lesion masks train the lesion module and validate explanations. They never touch the grading classifier's training loop. | Keeps explanation validation independent of grading training — otherwise "the CAM matches the lesion" is partly circular.                                                                                                       |
| **S4**   | DRIVE is used for vessel segmentation only, with explicit scale normalisation.                                                 | No DR labels; resolution mismatch means naïve transfer fails. §12.4.                                                                                                                                                            |
| **S5**   | The APTOS unlabelled test images never enter a supervised metric.                                                              | No ground truth exists. §6.1.                                                                                                                                                                                                   |
| **S6**   | Any split of Messidor-2 is by subject, not by image.                                                                           | Two images per subject; DR is bilaterally correlated. Image-level splitting is guaranteed leakage.                                                                                                                              |
| **S7**   | Preprocessing statistics (normalisation constants, quality thresholds) are computed on the training split only, then frozen.   | Computing them over train+val is a subtle and extremely common leak.                                                                                                                                                            |

_Table 7.1 — Separation rules. S1 and S7 are the two most frequently violated in student and hackathon projects._

## **7.2 Why merging is tempting and why we decline**

**Grading-schema mismatch.** APTOS and IDRiD both nominally use ICDR 0–4, but they were graded by different people under different protocols. Messidor's native scheme is not ICDR at all. Merging labels across schemes without a validated mapping injects systematic label noise that is indistinguishable from model error during debugging.

**Camera and domain shift.** IDRiD is single-camera 4288×2848 at 50°; APTOS is heterogeneous. A merged set gives the model an easy shortcut — learn the camera, not the disease. This inflates internal metrics and collapses on deployment.

**Resolution mismatch.** DRIVE at ~565 px and IDRiD at ~4288 px differ by roughly 7.6× in linear scale. A vessel-width of 5 px in DRIVE corresponds to ~38 px in IDRiD. Any filter bank, morphological structuring element or receptive field tuned on one is meaningless on the other unless scale is normalised explicitly.

**Annotation-type mismatch.** Image-level grade, pixel-level lesion mask and coordinate-level landmark are three different supervision signals. They can be combined in a multi-task architecture (§17) but cannot be concatenated as if they were the same thing.

**Validation contamination.** The most damaging: once a dataset has influenced any choice, its performance number becomes optimistically biased. External validation is only worth reporting if it was genuinely external.

## **7.3 The one merge we do sanction**

**Vessel segmentation across DRIVE and IDRiD-derived vessel proxies**, and only under scale normalisation. Justification: vessel morphology is far more consistent across populations than DR grading practice, the target (a binary tubular structure) is objectively defined, and the DRIVE set alone (20 training images) is too small to be robust. The merge is validated by holding out the DRIVE test set, and its benefit is _measured_ rather than assumed (§12.5). If it does not help, it is dropped.

# **8\. Data Governance, Splits and Leakage Control**

Leakage is the failure mode most likely to make this project look excellent and be worthless. It is silent, it inflates every metric, and it is only discoverable by deliberate design.

## **8.1 Ingestion and integrity**

RAW DATASET (read-only, never modified)

|

v

\[ingest\] --> compute SHA-256 per file

| record: path, bytes, dimensions, channels, EXIF where present

v

\[integrity\] --> decode test (can it be read at all?)

| corrupt / truncated / zero-byte --> QUARANTINE + log

| grayscale or wrong channel count --> QUARANTINE + log

v

\[dedupe\] --> exact duplicate : identical SHA-256

| near duplicate : perceptual hash (dHash/pHash) Hamming distance

| fellow-eye pairing : embedding cosine similarity (see 8.4)

v

\[label validation\] --> grade in {0..4}? one label per image? orphan labels?

| orphan images?

v

\[manifest\] --> versioned CSV/Parquet: id, sha256, split, grade, quality_flag,

| dedupe_group_id, dataset, ingest_version

v

DATASET VERSION vN (immutable, hash-stamped)

_Figure 8.1 — Ingestion pipeline. The manifest, not the folder of images, is the dataset._

## **8.2 The splitting problem**

APTOS provides no patient identifier. Diabetic retinopathy is a **bilateral, correlated** disease: if the left eye is grade 3, the right eye is very likely to be graded 2–4, and the two images share illumination, camera, operator and session characteristics. If a patient's two eyes land on opposite sides of a train/test split, the test set is partly memorised rather than predicted.

**Honest statement of the limitation**

We cannot guarantee patient-disjoint splits on APTOS, because the information required to do so was never released. We can only reduce the risk heuristically and **report the residual risk**. Claiming a patient-level split without patient identifiers would be a fabrication. This limitation is stated in the results section of any report we produce.

## **8.3 Split design**

| **Split**                   | **Share**             | **Construction**                                                               | **Used for**                                                                   |
| --------------------------- | --------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Train                       | ≈70%                  | Stratified by grade; dedupe-groups kept intact.                                | Gradient updates only.                                                         |
| Validation                  | ≈15%                  | Stratified by grade; dedupe-groups intact; disjoint from train at group level. | Early stopping, hyperparameters, **threshold selection**, temperature scaling. |
| Internal test               | ≈15%                  | Same construction. **Touched once**, at the end of Phase 9.                    | The single internal headline number.                                           |
| External test               | 100% of Messidor-2    | Subject-level; never split.                                                    | Domain-shift measurement. Opened once.                                         |
| Cross-validation (optional) | 5-fold over train+val | Group-aware stratified folds.                                                  | Variance estimation when the test set is too small to distinguish two models.  |

_Table 8.1 — Split design. Note that threshold selection and calibration happen on validation, never on test._

## **8.4 Heuristic fellow-eye grouping**

A three-stage procedure to find images likely to belong to the same patient, so they can be forced into the same split:

1. **Exact duplicates** — identical SHA-256. Rare but they exist in public datasets; always check.
2. **Near duplicates** — perceptual hash (dHash or pHash) with a small Hamming threshold. Catches re-encodings and minor crops of the same capture.
3. **Fellow-eye candidates** — embed every image with an ImageNet-pretrained backbone (no DR training, to avoid circularity), then look for high cosine similarity **after horizontal mirroring** of one image. The left and right fundus of one patient are approximately mirror-symmetric in vessel-arcade layout and share illumination and colour cast. Pairs above a conservative similarity threshold are grouped.

Grouped images receive a shared dedupe_group_id, and splitting is performed over groups rather than images. The procedure is deliberately **conservative** — over-grouping costs a little training data; under-grouping costs validity.

**Report this, do not hide it**

The number of groups found, the similarity threshold used, and a sample of grouped pairs should appear in the results appendix. A reviewer who sees that you _looked_ for leakage trusts the rest of your numbers more, even if you did not eliminate it entirely.

## **8.5 The complete leakage checklist**

| **#** | **Leakage vector**                                               | **Severity**               | **Control**                                                                                              |
| ----- | ---------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| L1    | Fellow eye of the same patient across splits.                    | High                       | Group-aware splitting (§8.4); residual risk reported.                                                    |
| L2    | Exact or near-duplicate images across splits.                    | High                       | Hash + perceptual-hash dedupe before splitting.                                                          |
| L3    | Normalisation statistics computed over the full dataset.         | Medium, very common        | Compute on train split only; freeze; version the constants.                                              |
| L4    | Quality thresholds tuned by inspecting test images.              | Medium                     | Thresholds fixed on train/val; test opened once.                                                         |
| L5    | Threshold or temperature fitted on the test set.                 | High                       | Both fitted on validation exclusively.                                                                   |
| L6    | Model selection by repeated test-set evaluation.                 | High, insidious            | Test evaluated once per major version; every access logged with a timestamp and a reason.                |
| L7    | Augmentation preview leaking test images into visual inspection. | Low                        | Visualisation notebooks restricted to train split.                                                       |
| L8    | Pretrained weights that saw the evaluation data.                 | Low here                   | ImageNet backbones are not trained on fundus data; documented for completeness.                          |
| L9    | Messidor-2 inspected before Phase 9.                             | Fatal to external validity | Rule S1; enforced by keeping the archive unpacked-but-unopened and by team discipline.                   |
| L10   | Simulink parameters silently tuned to make the demo look good.   | Reputational               | Scenario parameters declared before running; all seven scenarios reported, not just the flattering ones. |

_Table 8.2 — Leakage register. L6 and L9 are the ones that require discipline rather than code._

## **8.6 Versioning and provenance**

**Dataset version.** A hash of the manifest file. Any change to ingestion, dedupe or splitting produces a new version. Models record the dataset version they were trained on.

**Preprocessing version.** A semantic version plus a hash of the preprocessing configuration struct. **Critical**: a model is only valid with the preprocessing it was trained under. Serving a model with mismatched preprocessing is a silent, severe failure and is guarded by a runtime assertion.

**Label version.** Recorded separately, because label files may be corrected. A corrected label set invalidates prior metrics.

**Provenance record.** For each dataset: source URL, licence, download date, file count, total bytes, checksum of the archive. Stored alongside the manifest.

**Retention.** Public research datasets are retained as downloaded. Any future clinical data is governed by §53 and is _not_ mixed into research storage.

## **8.7 Class distribution monitoring**

Distribution is checked at three points and any deviation is treated as a bug: after ingestion (does it match the published distribution?), after splitting (is stratification actually holding, per group?), and after augmentation/sampling (is the effective training distribution what we intended, or has an oversampler quietly created 40% grade-3?). The third check catches a class of bug that otherwise surfaces only as inexplicable validation behaviour.

**PART III**

# **Retinal Image Analysis Pipeline**

# **9\. Image Quality Assessment**

This is the first module and the one with the highest safety leverage. Its purpose is not to score images. Its purpose is to prevent the system from producing a confident normal grade on an image in which the retina was never adequately visible — the single most dangerous failure this system can commit.

## **9.1 Design principle: gradeability, not aesthetics**

The question the module answers is deliberately narrow: **"can the lesions we need to detect be seen in this image?"** Not "is this a nice photograph." Those diverge more often than intuition suggests. An image can be dim and off-colour yet perfectly gradeable; an image can be bright and pleasant yet blurred past the point where a microaneurysm could survive.

Because the smallest clinically relevant structure sets the bar, the operational definition becomes: **an image is Grade A if fine vessel structure is resolvable across the posterior pole.** Fine vessels are similar in scale and contrast to the lesions we care about, so their visibility is a direct, measurable proxy for lesion detectability — and unlike the lesions, they are present in every eye.

## **9.2 Quality states**

| **Grade**           | **Definition**                                                                                                                   | **System action**                                                                                                                                                         | **Operator message**                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **A — Good**        | Field complete, focus adequate, illumination even, fine vessels resolvable, optic disc and macula visible.                       | Proceed directly to analysis. No enhancement beyond the standard normalisation path.                                                                                      | None. Move to next eye.                                                                                               |
| **B — Borderline**  | Gradeable but degraded: uneven illumination, low contrast, mild haze, or partial peripheral loss with the posterior pole intact. | Apply conservative enhancement, **re-assess**, and route to the robustness-aware inference path. Flag the report as "reduced quality".                                    | Optional retry prompt with the specific defect named.                                                                 |
| **C — Ungradeable** | Severe blur, gross over/under-exposure, field largely missing, macula obscured, or fine vessels not resolvable anywhere.         | **Refuse to grade.** Request recapture with a specific reason. After the retry budget is exhausted, emit P0 (cannot assess) and route to a human with the original image. | Specific, actionable: "Out of focus — refocus on the optic disc" / "Too dark — reduce ambient light, increase flash". |

_Table 9.1 — Quality states. The operator message column is a product requirement, not a nicety: a rejection without guidance produces a second identical failure._

## **9.3 Feature set: what is deterministic and what needs learning**

A pragmatic split. Deterministic features are cheap, interpretable, debuggable and require no labels — which matters because none of the four datasets carries usable quality labels. The learned layer sits on top of them.

| **Feature**                         | **Computation**                                                                                                                                         | **Detects**                                                             | **Type**                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------ |
| Field-of-view mask + coverage ratio | Threshold on max-channel intensity, largest connected component, morphological close, circle fit via imfindcircles or centroid+radius from regionprops. | Cropped field, off-centre capture, partial capture.                     | Deterministic                  |
| Laplacian / gradient variance       | Variance of imfilter with a Laplacian kernel, computed **inside the FOV mask only**, on the green channel.                                              | Global defocus blur.                                                    | Deterministic                  |
| High-frequency energy ratio         | FFT or wavelet: ratio of energy above a spatial-frequency cut-off to total in-mask energy.                                                              | Blur, more robustly than Laplacian variance under varying contrast.     | Deterministic                  |
| Vessel-resolvability index          | Run the vessel detector (§12) at fine scale; measure total detected vessel skeleton length and mean vesselness inside the posterior pole.               | **The key feature.** Directly measures whether fine structure survives. | Deterministic (uses CV module) |
| Illumination uniformity             | Large-kernel median or morphological opening to estimate background; report ratio of 95th to 5th percentile of the background field inside the mask.    | Vignetting, uneven flash, arc artefacts.                                | Deterministic                  |
| Exposure statistics                 | In-mask histogram: mean, percentiles, fraction of saturated (≥250) and crushed (≤5) pixels per channel.                                                 | Over/under-exposure, blown highlights, black-crush.                     | Deterministic                  |
| Contrast                            | In-mask standard deviation and interquartile range of the green channel.                                                                                | Flat, hazy images (media opacity, cataract, dirty lens).                | Deterministic                  |
| Colour cast / saturation            | Channel means and ratios; fraction of pixels where the red channel is saturated.                                                                        | White-balance failure, red-channel saturation typical of over-flash.    | Deterministic                  |
| Optic disc detectability            | Confidence returned by the OD localiser (§11).                                                                                                          | Gross obscuration; also serves as a landmark sanity check.              | Deterministic                  |
| Macula visibility                   | Local contrast and darkness in the expected foveal region given the OD position.                                                                        | Central obscuration — the most clinically damaging kind.                | Deterministic                  |
| Artefact / occlusion detection      | Bright arcs and blobs from lash, lens flare or dust: morphological top-hat plus shape filtering.                                                        | Eyelash shadow, flare, dust on optics.                                  | Learned (or heuristic in MVP)  |
| Overall gradeability                | Small classifier over the above vector.                                                                                                                 | The final A/B/C decision.                                               | **Learned**                    |

_Table 9.2 — Quality feature set. All in-mask computations exclude the black border; forgetting this is the most common bug in fundus quality code._

## **9.4 The classifier, and the labelling problem**

None of the four datasets ships gradeability labels. Three options, in ascending order of cost:

1. **Rule-based thresholds (MVP).** Hand-tuned cut-offs on the deterministic features, calibrated by visual inspection of a few hundred training images. Fast, fully interpretable, and adequate to demonstrate the concept. Every threshold is a documented constant in a versioned config file.
2. **Weak supervision (V1).** Generate synthetic degradations from known-good images — Gaussian blur at controlled σ, gamma shifts, additive vignetting, JPEG compression at low quality, simulated flare — and train a small classifier or ordinal regressor to predict the _degradation severity_. This produces a genuinely continuous quality score with no manual labelling. It also produces something valuable for free: a labelled robustness test set (§42).
3. **Human-labelled subset (V1+).** Have two annotators grade ≈500 training images A/B/C, measure inter-rater agreement, and fine-tune. Only worth doing once the rest of the pipeline is stable.

**Recommendation:** ship (1) for the MVP, build (2) during Phase 2 because it costs little and pays twice, defer (3).

**Design decision — a small learned model, deliberately**

The gradeability classifier is a shallow model (decision tree ensemble or small SVM via Statistics and Machine Learning Toolbox) over ~15 interpretable features, **not** a CNN on raw pixels. Reasons: (a) with no quality labels, a CNN would have nothing honest to learn from; (b) an interpretable model lets us tell the operator _which_ feature failed, which is the entire point of the recapture message; (c) it costs milliseconds. This is a case where the simpler model is not a compromise — it is better suited to the job.

## **9.5 Retry policy**

capture attempt n = 1

|

v

quality assess --> A or B --> proceed

|

C

|

v

n &lt; 2 ? -- yes --&gt; emit SPECIFIC operator guidance --> recapture, n = n+1

|

no

|

v

emit P0 "cannot assess", attach original image + failed feature vector,

route to human reviewer, log as ungradeable_after_retry

RATIONALE FOR n_max = 2

\- Patient tolerance and clinic throughput are real constraints.

\- Some eyes are genuinely unphotographable (dense cataract, small pupil,

media opacity). Retrying forever converts a clinical finding into a

workflow failure -- and "cannot be photographed" is itself information

worth sending to an ophthalmologist.

\- The recapture rate is a first-class monitored metric (Sec. 50) because a

rising rate usually means an equipment or training problem, not a

patient problem.

_Figure 9.1 — Retry policy. n_max is a configurable parameter and is swept in Simulink Scenario C (§40)._

## **9.6 The quality/severity confound — and how we avoid encoding it**

**A trap worth naming explicitly**

Advanced DR can itself degrade the image. Vitreous haemorrhage obscures the retina. Long-standing diabetes co-occurs with cataract, which hazes everything. A quality model trained naïvely on real images could therefore learn _"sick eyes look bad"_ and start rejecting exactly the patients who most need referral. That is a catastrophic, silent failure mode.

**Mitigations:** (a) train the quality model on _synthetic_ degradations of good images, so degradation is decorrelated from disease by construction (§9.4 option 2); (b) audit the grade distribution of rejected images — if rejection rate rises with true severity, the model is confounded and must be corrected; (c) route ungradeable images to a human rather than discarding them, so a confounded rejection still reaches a clinician. Mitigation (c) means that even if (a) and (b) fail, no patient is lost.

# **10\. Image Enhancement Pipeline**

Enhancement is the most dangerous stage in the pipeline, because every operation that makes an image look better is also capable of erasing a five-pixel lesion. The governing rule is that enhancement must be justified by a measured downstream effect, never by appearance.

## **10.1 Pipeline order, and why order matters**

1\. DECODE read at native resolution; no resampling yet

|

2\. FIELD MASK detect circular FOV; everything downstream

| operates in-mask only

3\. BORDER CROP tight bounding box of the mask; removes

| meaningless black area, cuts compute ~30%

4\. ILLUMINATION NORMALISATION estimate slow background (large-kernel

| median / morphological open), divide or

| subtract; corrects vignetting BEFORE any

| local contrast operator sees the image

5\. RESIZE (single step) to model input size, with area/Lanczos

| interpolation; ONE resample only

6\. COLOUR / CHANNEL PREP per-channel standardisation; green channel

| extracted for the CV branch

7\. CONTRAST (CLAHE, conditional) applied to the CV branch and to Grade B

| images; clip-limited

8\. DENOISE (conditional, mild) only for Grade B; edge-preserving only

WHY THIS ORDER

\* Mask before statistics: any histogram, mean or variance computed over the

black border is wrong, and the error scales with how much border there is.

\* Illumination before CLAHE: CLAHE is local, so it partially "fixes"

vignetting in a way that varies per tile and introduces tile-boundary

artefacts. Removing the global gradient first makes CLAHE well-behaved.

\* Resize once: two resamples compound interpolation blur. For a 5-pixel

lesion this is not a rounding error, it is deletion.

\* Denoise last and rarely: noise and microaneurysms occupy the same

spatial-frequency band. See 10.4.

_Figure 10.1 — Preprocessing order with rationale. The ordering constraints are causal, not stylistic._

## **10.2 Operation-by-operation justification**

| **Operation**              | **Why it exists**                                                                                                                                        | **Cost**                  | **Failure mode**                                                                                     | **Effect on lesions**                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Field mask                 | All statistics must be in-mask; enables tight crop.                                                                                                      | Very low                  | Fails on images already tightly cropped, or with a bright artefact outside the field.                | None (non-destructive).                                                               |
| Border crop                | Removes up to ~40% dead pixels; improves effective resolution at fixed input size.                                                                       | Very low                  | Over-crop clips genuine peripheral retina.                                                           | Positive — more retina per model pixel.                                               |
| Illumination normalisation | Fundus images are radially non-uniform by optical necessity. Corrects it globally.                                                                       | Low–medium (large kernel) | Kernel too small → subtracts the lesions themselves. Kernel must be **much larger** than any lesion. | **Risk if mis-sized.** Kernel ≥ 10× the largest lesion diameter.                      |
| Resize                     | Model input requirement.                                                                                                                                 | Low                       | Aggressive downscale destroys small lesions.                                                         | **Highest-risk operation in the pipeline.** §10.3.                                    |
| Green channel extraction   | Haemoglobin absorbs green strongly, so vessels and red lesions have maximal contrast there. Red channel is often saturated; blue is noisy with poor SNR. | Zero                      | Discards exudate colour information — so the bright-lesion branch keeps the colour image.            | Positive for red lesions; must not be the _only_ channel used.                        |
| CLAHE                      | Restores local contrast in hazy or low-contrast captures; helps both human review and classical detectors.                                               | Low–medium                | Amplifies noise; produces tile artefacts; over-enhancement creates lesion-like texture.              | **Double-edged.** Clip limit is the safety parameter. §10.4.                          |
| Denoise                    | Suppresses sensor noise in dark, high-gain captures.                                                                                                     | Medium                    | Removes microaneurysms outright.                                                                     | **Most dangerous operation.** Grade-B only, mild, edge-preserving.                    |
| Colour normalisation       | Reduces inter-camera colour cast — a domain-shift mitigation.                                                                                            | Low                       | Can suppress genuine pathological colour (fresh haemorrhage).                                        | Mild risk; prefer per-channel standardisation over histogram matching to a reference. |

_Table 10.1 — Enhancement operations. Note that the two most common "obvious" operations — resize and denoise — carry the highest lesion risk._

## **10.3 The resolution argument, quantified**

Source image (IDRiD-like): 4288 x 2848 px, ~50 deg field of view

Microaneurysm physical size: ~15-100 um (typically <=125 um)

Retina spanned by ~50 deg FOV: roughly 15 mm across \[ASSUMPTION,

order-of-magnitude only\]

\=> scale ~ 4288 px / 15000 um ~= 0.29 px per um

\=> a 60 um microaneurysm ~= ~17 px across at native resolution

Now downscale to common CNN input sizes:

input scale factor MA diameter verdict

\----- ------------ ----------- ----------------------------

224 19.1x ~0.9 px GONE. Sub-pixel. Unrecoverable.

384 11.2x ~1.5 px essentially gone

512 8.4x ~2.0 px marginal, 1-2 px blob

768 5.6x ~3.0 px usable

1024 4.2x ~4.1 px good

native 1.0x ~17 px ideal, computationally heavy

All figures ASSUMPTION-grade order-of-magnitude arithmetic. The conclusion

is robust to a factor of two either way, and the conclusion is:

\>>> INPUT RESOLUTION IS A FIRST-ORDER DESIGN PARAMETER, PROBABLY MORE

\>>> IMPORTANT THAN THE CHOICE OF BACKBONE. 224x224 IS NOT AN OPTION.

_Figure 10.2 — Why the ImageNet default input size is a correctness bug in this domain. Drives §16.4._

## **10.4 Lesion-preservation validation**

Every enhancement setting is validated against a criterion that has nothing to do with appearance. Using the IDRiD lesion masks:

1. For each annotated lesion, compute local contrast (lesion mean vs surrounding annulus mean, normalised) **before** and **after** the candidate enhancement.
2. Report the distribution of contrast change, separated by lesion type and lesion size. Microaneurysms in the smallest size decile are the acceptance criterion — if they lose contrast, the setting is rejected regardless of what it does to the rest.
3. Report **lesion survival rate**: the fraction of annotated lesions still detectable by a fixed reference detector after enhancement. **TARGET: ≥ 98% survival for microaneurysms.**
4. Sweep the CLAHE clip limit and tile size, and the denoise strength, against this criterion. Choose the operating point on this curve — not by looking at pictures.

**This experiment is cheap and almost nobody runs it**

It requires only the IDRiD masks and an afternoon. It converts "we apply CLAHE" from an unjustified default into a defended engineering choice with a number attached — and it will occasionally reveal that a setting everyone uses is destroying 8% of your microaneurysms. This is a strong answer to have ready when a judge asks "why CLAHE?"

## **10.5 Two branches, not one**

A single preprocessed image cannot serve both the CNN and the classical detectors well. The pipeline therefore forks after step 5:

| **Branch**         | **Feeds**                                | **Processing**                                                                                                                          | **Rationale**                                                                                                                                                                                                                                               |
| ------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Model branch**   | The DR classification CNN                | Mask → crop → illumination normalise → resize → per-channel standardise. **No CLAHE, no denoise** by default.                           | CNNs learn their own contrast normalisation. Adding CLAHE injects a non-linearity that must then be applied identically at inference — a deployment hazard — and empirically often does not help. Whether it helps is an ablation (§42), not an assumption. |
| **CV branch**      | Vessel, disc, fovea and lesion detectors | Mask → crop → illumination normalise → green channel → CLAHE (clip-limited) → scale-normalised for the detector's structuring elements. | Classical detectors are explicitly contrast- and scale-dependent and genuinely need this. Their structuring element sizes are derived from a measured pixels-per-degree, not hard-coded.                                                                    |
| **Display branch** | The reviewer UI and the report           | Model branch + gentle CLAHE + colour balance for human viewing.                                                                         | What the clinician sees should be optimised for human vision. This branch is **never** fed to any model.                                                                                                                                                    |

_Table 10.2 — Three branches. Keeping the display branch out of the model path prevents a subtle and popular category of bug._

## **10.6 MATLAB implementation notes**

**Field mask.** im2gray → imbinarize with a low threshold or a fixed cut-off on the max channel → bwareafilt(...,1) for the largest component → imclose with a disk → regionprops(...,"Centroid","EquivDiameter") for a circle fit. imfindcircles is available where the field is a clean circle but is slower and less robust to clipped fields.

**Illumination.** medfilt2 with a large kernel, or imopen with a disk structuring element much larger than any lesion, gives a background estimate; then divide (multiplicative model) or subtract (additive). Divide generally behaves better for flash vignetting.

**CLAHE.** adapthisteq(I, "ClipLimit", c, "NumTiles", \[r c\], "Distribution", "rayleigh"). Clip limit is the parameter validated in §10.4. Tile count must be chosen so tiles are large relative to lesions but small relative to illumination variation.

**Resize.** imresize(I, \[h w\], "Method", "lanczos3") for downscale; "box"/area averaging is an alternative worth benchmarking against the lesion-survival criterion.

**Reproducibility.** The entire preprocessing configuration lives in one struct, is hashed, and is written into the model artefact. Inference asserts the hash matches. This single assertion prevents an entire family of production failures.

# **11\. Retinal Region Localization**

Locating the optic disc and fovea costs little and pays in four places: exudate precision, quality assessment, report readability, and explanation credibility.

## **11.1 What localization buys us**

| **Consumer**       | **What it uses**                       | **Value**                                                                                                                                                                   |
| ------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lesion detection   | Optic disc mask                        | The disc is bright, round and sharp — the dominant false-positive source for hard-exudate detection. Masking it is the highest-yield precision fix available.               |
| Quality assessment | Disc and fovea detectability           | If neither landmark is findable, the image is almost certainly Grade C. A cheap, strong signal.                                                                             |
| Report generation  | Fovea position                         | Enables clinically meaningful phrasing: "hard exudates within one disc diameter of the fovea" is actionable; "exudates present" is not.                                     |
| Explainability     | Both landmarks + vessel arcades        | Overlaying anatomy on the Grad-CAM lets a reviewer orient instantly. Without it, a heatmap on a red disc is just a coloured blob.                                           |
| Sanity checking    | Disc–fovea geometry                    | Disc and fovea sit in a roughly fixed spatial relationship (~2–2.5 disc diameters apart, on the horizontal raphe). Violation means the localiser failed — a free self-test. |
| Laterality         | Disc position relative to image centre | Disc temporal/nasal position identifies left vs right eye without metadata — useful for report labelling and for fellow-eye grouping (§8.4).                                |

_Table 11.1 — Consumers of localization. Row 5 in particular gives a free integrity test that costs one line of code._

## **11.2 Method comparison**

| **Approach**                   | **Optic disc**                                                                                                 | **Fovea**                                                                                            | **Robustness**                                                                  | **Cost**                    | **Verdict**                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------ |
| Brightest-region / intensity   | Often works — the disc is usually the brightest structure.                                                     | Poor alone.                                                                                          | Fails with large exudate plaques or flare, which can be brighter.               | Trivial                     | MVP component, but never alone.                  |
| Circular Hough (imfindcircles) | Good when the disc rim is clean.                                                                               | N/A — fovea has no edge.                                                                             | Fails on blurred or partly obscured discs.                                      | Low                         | MVP, combined with intensity.                    |
| Vessel-convergence             | Strong — all major vessels radiate from the disc, so convergence of the vessel skeleton localises it robustly. | Indirect (fovea is avascular).                                                                       | **Best classical robustness**; independent of brightness, so it survives flare. | Medium (needs vessel map)   | **Recommended primary** for the disc.            |
| Template matching              | Moderate.                                                                                                      | Moderate — the fovea is a dark, low-contrast, avascular disc-sized region.                           | Sensitive to scale and colour.                                                  | Low                         | Supporting evidence only.                        |
| Anatomical prior               | N/A                                                                                                            | **Strong** — given the disc position and the vessel arcades, the fovea is geometrically constrained. | Very good.                                                                      | Trivial                     | **Recommended primary** for the fovea.           |
| CNN regression / segmentation  | Excellent.                                                                                                     | Excellent.                                                                                           | Best, but needs labels.                                                         | High (training + inference) | V1, trainable on IDRiD localisation annotations. |

_Table 11.2 — Localization methods._

## **11.3 Recommended MVP approach — evidence fusion**

OPTIC DISC (fuse three weak detectors into one strong one)

e1 brightness : top-percentile intensity, disc-sized morphological

opening on the red/green channel

e2 circularity : imfindcircles over the plausible radius range,

derived from measured pixels-per-degree

e3 convergence : vessel skeleton (Sec.12) -> local density + orientation

coherence; the disc is where vessels converge

score(x,y) = w1\*e1 + w2\*e2 + w3\*e3 -> argmax -> disc centre

radius = from e2 if available, else from the pixels-per-degree prior

confidence = agreement among the three detectors <-- feeds quality (Sec.9)

FOVEA (geometric prior + local confirmation)

\* approx 2-2.5 disc diameters from the disc centre,

on the temporal side, near the horizontal raphe

\* confirm with a local darkness minimum in an avascular neighbourhood

\* if geometry and local evidence disagree -> low confidence -> report

lesion positions in absolute terms only, and say so

SELF-TEST

if |disc-fovea distance| outside \[1.5, 3.5\] disc diameters

\-> localisation failed -> degrade gracefully, do not fabricate anatomy

_Figure 11.1 — Fusion-based localization. Three weak, cheap, independent detectors beat one clever one, and the disagreement signal is itself useful._

**Design note.** The fusion confidence is not discarded — it feeds both the quality module (§9.3) and the report. A report that says "fovea position uncertain; lesion distances not reported" is more trustworthy than one that quietly reports distances from a guessed landmark.

# **12\. Blood Vessel Segmentation**

Vessel segmentation earns its place three times over: as a confounder suppressor for lesion detection, as the most reliable optic-disc localiser, and as the best available proxy for image gradeability. Whether it also helps the DR classifier is an empirical question, and we treat it as one.

## **12.1 Why it matters here**

- **Confounder suppression.** A vessel seen end-on, or a small vessel bifurcation, looks very like a microaneurysm to a blob detector. Subtracting a dilated vessel mask from the MA candidate set is the largest single precision gain available to the red-lesion detector.
- **Optic disc localisation.** Vessel convergence is the most flare-robust disc cue (§11.3).
- **Quality proxy.** Fine-vessel detectability is a direct, measurable proxy for microaneurysm detectability (§9.1). This is arguably its highest-value use.
- **Explainability.** Overlaying the vessel map orients the reviewer and makes lesion positions legible.
- **Future pathology signal.** Venous beading, tortuosity and neovascularisation are all vessel-morphology findings. V2 territory, but the map is the prerequisite.

**What we explicitly do not assume**

That feeding a vessel mask into the DR classifier improves grading. It may; it may not; concatenating channels can just as easily hurt by consuming capacity. This is listed as an ablation arm in §42, and the vessel branch stays out of the classifier unless the ablation supports it. §7 rule: do not force vessel segmentation into the classifier without measurable benefit.

## **12.2 Method comparison**

| **Method**                                | **Mechanism**                                                                      | **Strength**                                                                         | **Weakness**                                                                            | **Role**                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------- |
| Green channel + CLAHE + morphology        | Top-hat with linear structuring elements at multiple orientations, then threshold. | Fast, no training, fully interpretable.                                              | Misses the finest vessels; threshold sensitivity.                                       | MVP baseline.                      |
| Matched filters                           | Bank of Gaussian-profile filters at multiple orientations and scales.              | Classical, well-understood, decent recall.                                           | False positives at lesion edges and disc rim.                                           | Baseline component.                |
| Frangi / Hessian vesselness (fibermetric) | Eigenvalue analysis of the Hessian selects tubular structures at a given scale.    | **Available directly in Image Processing Toolbox.** Multi-scale, principled, strong. | Scale set must match true vessel widths in pixels; noisy near the disc.                 | **Recommended classical primary.** |
| U-Net                                     | Encoder–decoder trained on DRIVE.                                                  | Best accuracy where the domain matches.                                              | 20 training images; severe resolution mismatch with APTOS (§7.2); needs patch training. | V1, with scale normalisation.      |
| Lightweight seg net                       | Reduced-width U-Net or DeepLabv3+ with a small backbone.                           | Edge-deployable.                                                                     | Same data limits.                                                                       | V1 edge variant.                   |

_Table 12.1 — Vessel segmentation methods._

## **12.3 Recommended approach**

**MVP:** multi-scale fibermetric on the CLAHE-enhanced green channel, followed by hysteresis thresholding, bwareaopen to strip specks, and morphological closing to bridge small gaps. Validated on DRIVE with Dice/IoU and sensitivity at fixed specificity, and — critically — validated _at DRIVE's scale after normalisation_, not at DRIVE's pixel size.

**V1:** patch-based U-Net trained on scale-normalised DRIVE, with the classical result retained as a fallback and as a cross-check. Where the two disagree strongly, the image is flagged — disagreement between an independent classical and learned detector is a useful anomaly signal.

## **12.4 The scale-normalisation rule**

**The rule that makes cross-dataset vessel work possible**

Never match **image size**. Match **vessel width in pixels**.

Estimate pixels-per-degree for each image from the detected field-of-view diameter and the known camera field angle (45° or 50°). Resample every image so that the major arcade vessels occupy a **consistent pixel width** — a target of roughly 8–12 px for the major arcades is a sensible starting point, to be tuned.

Only then do multi-scale filter parameters, morphological structuring element sizes and U-Net receptive fields mean the same thing across DRIVE, IDRiD and APTOS. Without this step, a model trained on 565-pixel DRIVE images applied to 4288-pixel IDRiD images is looking for structures roughly 7.6× too small, and will find essentially nothing.

## **12.5 Validation**

- DRIVE test set: Dice, IoU, sensitivity at matched specificity, plus AUC of the vesselness map before thresholding.
- **Human ceiling:** DRIVE's second observer provides an inter-annotator agreement figure. Report our score _against_ that ceiling — "0.79 Dice where the second human scores 0.79" is a far more informative statement than "0.79 Dice".
- Cross-domain check: apply the DRIVE-validated model to scale-normalised APTOS images and inspect qualitatively; measure the vessel-resolvability index distribution and confirm it correlates with the quality grade (a strong consistency check between two independent modules).

# **13\. Lesion Detection**

Lesion evidence is what turns a heatmap into a clinical argument. It is also where overclaiming is easiest, so each lesion class is scoped by what the available data can actually support.

## **13.1 Scope discipline by lesion class**

| **Lesion**                  | **IDRiD masks?** | **Detectability at screening resolution**                | **Scope**                                                                                                |
| --------------------------- | ---------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Hard exudates               | Yes              | Good — high contrast, reasonable size.                   | **MVP.** The most reliable lesion evidence available.                                                    |
| Haemorrhages                | Yes              | Good for blots; harder for small dots.                   | **MVP.**                                                                                                 |
| Microaneurysms              | Yes              | Hard — resolution-limited, low contrast.                 | **MVP with an explicitly stated precision/recall trade-off**, not as a solved problem. §13.3.            |
| Soft exudates (cotton-wool) | Yes              | Moderate — fuzzy borders, confusable with hard exudates. | V1.                                                                                                      |
| Neovascularisation          | No mask          | Poor at typical screening resolution and quality.        | **Not detected explicitly.** Contributes to the grade-4 signal via the CNN only. Stated as a limitation. |
| Venous beading / IRMA       | No mask          | Requires calibre profiling along vessel centrelines.     | **V2 research.** Not claimed.                                                                            |

_Table 13.1 — Lesion scope. Rows 5 and 6 are deliberately declined. Declining them is what makes rows 1–3 believable._

## **13.2 Bright lesions — hard exudates**

input: colour image, illumination-normalised, field-masked

|

1\. CHANNEL : green or luminance; exudates are bright in both,

| but colour (yellow-white vs pale) separates hard

| from soft exudates -> keep colour for that step

2\. BACKGROUND : morphological opening with a disk LARGER than the

| largest expected exudate -> subtract

3\. CANDIDATES : adaptive / hysteresis threshold on the residual

|

4\. DISC EXCLUSION : subtract the optic disc mask, dilated by a margin

| &lt;<< the single highest-yield precision step &gt;>>

5\. SHAPE FILTER : area, solidity, eccentricity via regionprops;

| drop elongated structures (reflection arcs, vessels)

6\. HARD vs SOFT : border sharpness (gradient magnitude at the boundary)

| + colour; hard = sharp + yellow, soft = fuzzy + pale

7\. CONTEXT : distance to fovea in disc-diameter units -> report

|

output: exudate mask + per-lesion attributes + distance-to-fovea summary

_Figure 13.1 — Bright lesion pipeline. Step 4 alone typically transforms the precision of this detector._

## **13.3 Red lesions — microaneurysms and haemorrhages**

input: green channel, illumination-normalised, CLAHE, field-masked

|

1\. CANDIDATE GENERATION (high recall, low precision -- on purpose)

| multi-scale morphological bottom-hat / dark-blob detection,

| or multi-scale Laplacian-of-Gaussian, at scales derived from the

| measured pixels-per-degree

v

2\. VESSEL SUPPRESSION

| subtract dilated vessel mask (Sec.12)

| <<< removes the dominant false-positive class: vessel cross-sections

| and bifurcations >>>

v

3\. FEATURE EXTRACTION per candidate

| area, equivalent diameter, eccentricity, solidity,

| local contrast vs surrounding annulus, intensity percentiles,

| distance to nearest vessel, colour ratios, local texture

v

4\. CANDIDATE CLASSIFIER (Statistics & ML Toolbox: boosted trees / SVM)

| trained on IDRiD MA and haemorrhage masks

| outputs a per-candidate probability, NOT a hard yes/no

v

5\. SIZE-BASED SEPARATION

| MA vs dot-haemorrhage boundary is genuinely fuzzy even clinically;

| we report a combined "red lesion" count plus a size histogram

| rather than pretending to a crisp separation we cannot defend

v

output: red-lesion probability map + counts by size band + per-lesion scores

_Figure 13.2 — Red lesion pipeline. Step 5 is a deliberate honesty measure: we report what we can defend._

**How the microaneurysm claim is stated**

We do **not** claim "microaneurysm detection". We claim: _"a red-lesion candidate detector with a calibrated per-candidate probability, validated against IDRiD annotations, reported as free-response ROC (FROC) — sensitivity at a stated false-positives-per-image rate."_

FROC is the correct metric for sparse small-object detection, and it forces the operating point into the open. "We detect microaneurysms" is unfalsifiable; "at 8 false positives per image we recover 62% of annotated MAs" is a result. **MEASURED value to be filled at Phase 4.**

The candidate probability is also what feeds the explanation layer, so the reviewer sees graded evidence rather than a binary overlay that is silently wrong 40% of the time.

## **13.4 How lesion evidence feeds the rest of the system**

| **Consumer**            | **What it takes**                           | **Why not just use the CNN**                                                                                                                                           |
| ----------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explanation layer (§24) | Per-lesion locations + probabilities.       | Grad-CAM cannot resolve individual microaneurysms (§24.3). The lesion layer supplies the spatial precision the CAM lacks.                                              |
| Report (§26)            | Counts by type, distance-to-fovea summary.  | A count is checkable by the reviewer in a glance; a probability is not.                                                                                                |
| Escalation (§27)        | Large-haemorrhage or dense-lesion triggers. | A rule-based safety net that does not depend on the CNN being right.                                                                                                   |
| Ablation (§42)          | Lesion features as an auxiliary input.      | Tests whether explicit lesion features add anything the CNN has not already learned. The honest expectation is "a little, or nothing" — and we report whichever it is. |

# **14\. On "Sub-Pixel" Microaneurysm Detection**

**This section exists because the honest answer is more valuable than the impressive one**

The problem framing places heavy emphasis on precise microaneurysm detection. A team that responds by claiming sub-pixel clinical detection will be asked one follow-up question and will not have an answer. This section gives that answer, and proposes something defensible that still addresses the requirement.

## **14.1 What "sub-pixel" can and cannot mean**

| **Interpretation**                                                                         | **Physically possible?**                                                                                                                                         | **Assessment**                                                                                                         |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Detecting** a lesion smaller than one pixel                                              | **No.** If a structure's signal falls below the sensor's spatial sampling and noise floor, the information is not in the file. No algorithm recovers it.         | Cannot be claimed. Would be a false statement about physics, not a modelling weakness.                                 |
| **Localising the centroid** of an already-detected multi-pixel blob to sub-pixel precision | **Yes.** Standard practice in astronomy and particle tracking: fit a 2-D Gaussian or compute an intensity-weighted centroid over the blob and its neighbourhood. | **Legitimate and implementable.** Precision is governed by SNR and the number of pixels on target.                     |
| **Super-resolving** the image to reveal new lesions                                        | Partially, and dangerously. Learned super-resolution generates _plausible_ detail consistent with its training prior. It does not recover ground truth.          | **Must not be used to justify a clinical detection.** A hallucinated microaneurysm is an iatrogenic finding.           |
| **Interpolating** to a larger grid before detection                                        | Adds no information. Bicubic upsampling creates smoother pixels, not more evidence.                                                                              | Cosmetic. Occasionally helps a detector's numerics; never adds signal. Should not be described as sub-pixel detection. |

_Table 14.1 — Four things "sub-pixel" could mean. Only the second is both possible and honest._

## **14.2 Why interpolation and super-resolution do not create information**

Interpolation is a deterministic function of the pixels already present. It cannot increase the mutual information between the image and the underlying retina; by the data-processing inequality it can only preserve or reduce it. What it changes is the _representation_, which can occasionally help a downstream algorithm behave better numerically — but the evidence content is fixed at capture.

Learned super-resolution is different and more hazardous. It genuinely adds detail, but the detail comes from the training prior, not the patient. For natural images this is delightful. For a screening system where a two-pixel dark blob determines whether someone is referred, a generative prior that has learned "retinas usually have microaneurysms here" is a liability. **Super-resolution is therefore excluded from any path that leads to a clinical output.** It may be used, clearly labelled, for display only.

## **14.3 What we build instead**

1. **Native-resolution candidate detection.** Detect on the highest resolution the compute budget allows, not on the CNN input. The candidate detector and the classifier do not have to share an input size — this is a design freedom worth using.
2. **Sub-pixel centroid refinement.** For each detected candidate, fit a 2-D Gaussian (or compute the intensity-weighted centroid) over a small window to obtain a sub-pixel centre estimate, with an associated positional uncertainty derived from the fit residual and local noise. This is real sub-pixel localisation, correctly described.
3. **Explicit detection limit.** Report the estimated minimum detectable lesion diameter for each image, computed from that image's measured pixels-per-degree and its noise floor. This is a genuinely novel and useful per-image output: _"in this image, lesions below ≈X µm could not have been detected."_
4. **FROC reporting.** Sensitivity as a function of false positives per image (§13.3), rather than a single sensitivity figure that hides the operating point.
5. **Uncertainty propagated to the report.** Each lesion carries a detection probability and a positional uncertainty. The reviewer sees graded evidence.

**The reframed claim — and why it is stronger**

**Not:** "Our system detects microaneurysms at sub-pixel resolution."

**Instead:** "Our system detects microaneurysm candidates at native image resolution, refines each detected centroid to sub-pixel precision with a stated positional uncertainty, and reports a per-image detection limit derived from that image's resolution and noise floor — so a clinician knows not only what was found, but what could not have been found."

The second statement is true, is implementable in a weekend, and answers a question the first statement cannot: _what did you miss?_ For a screening system, that is the more important question — and a panel of technical judges will recognise that immediately.

**PART IV**

# **AI/ML Architecture, Training and Evaluation**

# **15\. AI/ML Architecture: What Learns and What Does Not**

Not every component should be a neural network. Assigning each sub-problem to the cheapest technique that can solve it reliably is an engineering decision, and here it also improves explainability — a deterministic component can be explained by reading its code.

## **15.1 The four-layer split**

| **Layer**                      | **Components**                                                                                                                                                          | **Why this layer**                                                                                                                                            | **Explainability**                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Classical image processing** | Field mask, border crop, illumination normalisation, CLAHE, green-channel extraction, morphological candidate generation, vessel filtering (Frangi), disc/fovea fusion. | Deterministic, label-free, fast, debuggable. These problems have known analytical structure — throwing a network at them wastes the structure and the labels. | Complete. The algorithm _is_ the explanation.       |
| **Classical machine learning** | Gradeability classifier over quality features; lesion-candidate classifier over shape/contrast features.                                                                | Small feature vectors, limited labels, need for feature-level interpretability (to tell the operator _why_ an image was rejected).                            | High — feature importances are directly meaningful. |
| **Deep learning**              | DR severity classifier (ordinal CNN). Optionally vessel/lesion segmentation networks in V1.                                                                             | The grading task genuinely requires learned hierarchical features; no hand-crafted feature set has matched CNNs here.                                         | Partial — requires the explanation layer.           |
| **Explainable AI**             | Grad-CAM, lesion-evidence overlay, anatomical context, calibrated confidence, structured rationale.                                                                     | Converts the deep layer's opacity into something reviewable.                                                                                                  | This layer _is_ the mitigation for layer 3.         |

_Table 15.1 — Technique assignment. Roughly 70% of the pipeline by component count is deterministic, which is a deliberate explainability choice._

# **16\. DR Classification Model Selection**

## **16.1 Constraints that eliminate most of the option space**

- **≈3,662 labelled images.** Small. Training from scratch is not viable; transfer learning is mandatory.
- **Ordinal, imbalanced, noisy labels.** Argues for ordinal formulation, class-aware sampling and label smoothing, and against squeezing the last fraction of a point out of the loss.
- **High input resolution is required** (§10.3). Resolution consumes the memory and compute budget that a larger backbone would otherwise use — so there is a direct trade-off between "bigger model" and "bigger image", and in this domain the image usually wins.
- **Must run on a CPU-capable laptop.** Rules out heavyweight backbones at high resolution for the deployed configuration.
- **Must be trainable and deployable within MATLAB Deep Learning Toolbox.** Backbone availability in the installed MATLAB release is a hard gate — **TO BE VERIFIED** against the specific version and support packages in hand.
- **Must support Grad-CAM.** Requires an identifiable final convolutional feature map — true of all CNNs, awkward for ViTs (attention rollout is the analogue, and MATLAB tooling for it is thinner).

## **16.2 Model selection matrix**

| **Criterion**                   | **ResNet-18**              | **EfficientNet-B0**              | **ResNet-50**               | **DenseNet-201**                  | **ViT-B/16**                                             |
| ------------------------------- | -------------------------- | -------------------------------- | --------------------------- | --------------------------------- | -------------------------------------------------------- |
| Parameters (approx)             | 11.7 M                     | 5.3 M                            | 25.6 M                      | 20 M                              | 86 M                                                     |
| Expected QWK on ~3.6k images    | Good                       | **Best of these**                | Good; overfits more readily | Good; heavy                       | Poor without large-scale pretraining and a long schedule |
| Referable sensitivity potential | Good                       | **Good**                         | Good                        | Good                              | Unproven at this data scale                              |
| Inference latency @512² (CPU)   | Moderate                   | **Low** (depthwise convolutions) | High                        | High                              | Very high                                                |
| Memory at 512²–768²             | Moderate                   | **Low**                          | High                        | **Highest** (dense concatenation) | Very high                                                |
| MATLAB availability             | Built-in / support package | Support package — **verify**     | Built-in / support package  | Support package                   | Limited; typically via ONNX import — **verify**          |
| Grad-CAM support                | Native, clean              | Native, clean                    | Native, clean               | Native, clean                     | Awkward — needs attention rollout                        |
| Training complexity             | **Lowest**                 | Low–moderate                     | Moderate                    | Moderate                          | **Highest**                                              |
| Edge suitability                | Good                       | **Best**                         | Moderate                    | Poor                              | Poor                                                     |
| Data efficiency                 | Good                       | **Good**                         | Moderate                    | Moderate                          | Poor                                                     |
| **Verdict**                     | **MVP baseline**           | **SIH demo + V1 primary**        | Ablation comparator         | Not recommended (memory)          | **V2 research only**                                     |

_Table 16.1 — Model selection matrix. All performance entries are expectations to be replaced by MEASURED values in Phase 3._

## **16.3 Recommendation by stage**

**MVP. ResNet-18 @ 384², ordinal head.** Chosen for fast iteration, not final quality. The point of the MVP model is to make the _pipeline_ testable end-to-end within days so that quality gating, explanation and reporting can be built against something real.

**SIH demo / V1. EfficientNet-B0 @ 512², cumulative-link ordinal head, temperature-scaled.** Best accuracy-per-FLOP in this size class, deployable on CPU, clean Grad-CAM. Resolution raised to 640–768² if the latency budget permits — validated against the resolution ablation, not assumed.

**Production V1.** Same architecture; the changes are in data and process, not in the network — better splits, external validation, per-site calibration, drift monitoring. **This is deliberate.** Architecture churn is the least productive way to improve a medical imaging system at this data scale.

**V2 research.** Multi-task shared encoder (§17); self-supervised pretraining on the unlabelled APTOS test images (a genuinely good use for them, §6.1); ViT once data volume justifies it.

## **16.4 Resolution is the hyperparameter to tune**

Before any backbone comparison, run the resolution ablation: identical architecture and schedule at 256, 384, 512, 640, 768. **Hypothesis** (from §10.3): QWK and, more importantly, grade-1 and grade-2 recall improve materially with resolution up to at least 512, with diminishing returns after. If this holds, resolution is where the compute budget belongs. If it does not hold, that is itself an important finding — it would suggest the model is grading on large-scale appearance rather than lesions, which is a red flag worth chasing.

**An experiment that doubles as a scientific check**

The resolution ablation is not just tuning. If a model performs identically at 224² and 768², it is not using microaneurysms — because they do not exist at 224². That would mean the model is exploiting some coarser correlate of severity, and the explanation layer would then be showing us where that correlate lives rather than where the disease is. Running this ablation early tells you what your model is actually doing.

## **16.5 Ensembles — the honest position**

Ensembling reliably yields small gains in QWK and calibration. It also multiplies inference cost and complicates explanation (whose Grad-CAM do you show?). Position:

- **Not in the MVP.** Complexity without demonstrated need.
- **Test-time augmentation** (horizontal flip plus a small rotation set) is a _cheap_ pseudo-ensemble that improves stability at ~2–4× inference cost and no training cost. Evaluate this first — it is usually most of the benefit for a fraction of the price.
- **Multi-model ensemble only if measured.** Acceptance rule stated up front: adopt only if it improves referable-DR sensitivity at fixed specificity by a margin exceeding the bootstrap confidence interval, on validation. Adopting an ensemble for a gain inside the noise band is self-deception.
- **Explanation policy under ensembling:** show the CAM of the highest-confidence member and state that it is one member's view, or average CAMs after per-member normalisation. Either is defensible; silently showing one member without saying so is not.

# **17\. Multi-Task Learning**

## **17.1 The candidate tasks and their data**

| **Task**            | **Labels available**  | **From**         | **Same images as grading?**        |
| ------------------- | --------------------- | ---------------- | ---------------------------------- |
| DR severity (0–4)   | Yes                   | APTOS            | —                                  |
| Referable DR        | Derived from severity | APTOS            | Yes — free                         |
| Vessel segmentation | Yes                   | DRIVE            | **No** — different images entirely |
| Lesion segmentation | Yes                   | IDRiD            | **No**                             |
| Image quality       | No real labels        | synthetic (§9.4) | Can be made yes                    |
| Optic disc / fovea  | Yes                   | IDRiD            | **No**                             |

_Table 17.1 — The fourth column is the problem: most auxiliary labels live on different images than the grading labels._

## **17.2 Analysis**

Classical multi-task learning assumes multiple labels on the _same_ sample. Here, three of the five auxiliary tasks are annotated on entirely different datasets, which forces alternating-batch training across heterogeneous sources — feasible, but it introduces domain shift _inside_ the training loop and makes loss weighting delicate and hard to debug.

| **Consideration** | **Assessment**                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared encoder    | Attractive in principle: lesion segmentation should teach the encoder to attend to lesions, which is exactly what grading needs.                                                                        |
| Missing labels    | Handled by masking the loss per task per batch. Adds bookkeeping and a class of silent bugs (a masked loss that is silently always zero is easy to write and hard to notice).                           |
| Loss weighting    | Requires tuning across tasks with different scales and gradient magnitudes. Uncertainty-based automatic weighting exists but adds its own parameters.                                                   |
| Negative transfer | Real risk. Vessel segmentation on 565-px DRIVE images could actively harm an encoder operating on 512-px crops of 4288-px APTOS images — different scale statistics, different noise, different colour. |
| Data availability | IDRiD segmentation subset is small (tens of images). Its gradient contribution would be tiny or, if upweighted, would overfit those specific images.                                                    |
| Debuggability     | A multi-task model that underperforms gives you five hypotheses instead of one. At hackathon timescale that is a serious cost.                                                                          |

## **17.3 Decision**

**Multi-task learning: V2, not MVP**

**MVP / V1:** single-task ordinal grading network. Lesion and vessel modules run as **separate, independently validated components**. This is architecturally cleaner, independently testable, and — importantly for explanation — means the lesion evidence is genuinely independent of the grading model rather than a second head on the same trunk.

**The one exception, adopted now:** the cumulative-link ordinal head is _already_ multi-output. P(grade≥1), P(grade≥2), P(grade≥3), P(grade≥4) are four related supervised outputs from one encoder, all derived from the single available label. This captures the main benefit of multi-task learning — a richer supervisory signal — at zero data cost and zero added complexity.

**V2:** revisit a shared encoder with lesion segmentation once there is enough annotated data and a stable baseline to measure against.

# **18\. Training Pipeline**

## **18.1 End-to-end flow**

MANIFEST (dataset vN, train split only)

|

v

imageDatastore + custom read function

| - decode at native resolution

| - apply PREPROCESSING vM (model branch, Sec.10.5)

| - cache preprocessed tensors to disk on first epoch <-- large speedup

v

AUGMENTATION (training only, seeded)

|

v

CLASS-AWARE SAMPLING (Sec.19)

|

v

TRAIN LOOP (trainingOptions / trainnet)

| - backbone initialised from ImageNet weights

| - discriminative LR: low for early blocks, higher for the head

| - cosine schedule with warm-up

| - mixed precision if GPU available

| - checkpoint every epoch

| - early stopping on VALIDATION QWK (not loss, not accuracy)

v

VALIDATION (each epoch)

| - QWK, referable sensitivity/specificity, per-class recall

v

BEST CHECKPOINT

|

v

CALIBRATION on validation (temperature scaling, Sec.22)

|

v

THRESHOLD SELECTION on validation (Sec.21.3)

|

v

EXPORT: weights + preprocessing hash + temperature + thresholds

| + dataset version + git commit + training config

v

MODEL ARTEFACT vK (immutable, everything needed to reproduce or serve)

_Figure 18.1 — Training pipeline. Calibration and threshold selection are part of the artefact, not afterthoughts applied at serving time._

## **18.2 Augmentation: what is clinically valid**

| **Augmentation**             | **Valid?**               | **Reasoning**                                                                                                                                                                                           |
| ---------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Horizontal flip              | **Yes**                  | Turns a left eye into a right eye — a real, naturally occurring variation. The single most valuable augmentation here.                                                                                  |
| Rotation (±15–30°)           | **Yes**                  | Head tilt and camera rotation genuinely vary. Keep moderate; extreme rotation breaks the disc–fovea geometric prior the rest of the pipeline relies on.                                                 |
| Random resized crop (mild)   | **Yes, mild**            | Framing varies. Aggressive cropping can exclude the macula and change the true label — the augmentation would then be teaching the model the wrong answer.                                              |
| Brightness / contrast jitter | **Yes**                  | Directly models the exposure variation this system exists to survive.                                                                                                                                   |
| Colour / hue jitter (mild)   | **Yes, mild**            | Models camera and white-balance variation. Strong hue shifts destroy the red/yellow distinction that separates haemorrhages from exudates.                                                              |
| Gaussian blur (mild)         | **Yes, mild**            | Models focus variation and improves robustness on Grade-B images. Must stay mild — heavy blur deletes microaneurysms and mislabels the sample.                                                          |
| Additive noise (mild)        | **Yes, mild**            | Models sensor noise in dark captures.                                                                                                                                                                   |
| Simulated vignetting / flare | **Yes**                  | Directly models the dominant real-world degradation. Underused and cheap.                                                                                                                               |
| Vertical flip                | **No**                   | Produces an anatomically impossible retina — vessel arcades have a definite superior/inferior asymmetry. Teaching the model that upside-down retinas are normal wastes capacity on an impossible input. |
| Elastic deformation          | **No**                   | Distorts vessel geometry and lesion morphology, which are the diagnostic features.                                                                                                                      |
| Heavy JPEG artefacting       | **No** (as augmentation) | Destroys microaneurysms. Useful as a **robustness test** input, not as a training augmentation.                                                                                                         |
| Mixup / CutMix               | **Not for MVP**          | Blending two retinas produces an image whose "grade" is not physically meaningful. Mixup on ordinal medical labels needs careful justification we do not have time to develop.                          |
| Random erasing               | **No**                   | Could erase the only lesion, silently converting a grade-2 into an image whose correct label is now 0.                                                                                                  |

_Table 18.1 — Augmentation policy. The "No" rows share a theme: they can change the true label without changing the label field._

## **18.3 Hyperparameters and schedule**

| **Parameter**            | **Starting value**                     | **Note**                                                                                                           |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Optimiser                | AdamW (or SGD + momentum)              | AdamW converges faster on small datasets; SGD sometimes generalises marginally better. Not worth extensive search. |
| Base learning rate       | 1e-4 (head 1e-3)                       | Discriminative rates: the ImageNet features are good, the head is random.                                          |
| Schedule                 | Cosine decay, 3-epoch warm-up          | Warm-up prevents the random head from destroying pretrained features in the first steps.                           |
| Batch size               | Largest that fits at target resolution | Resolution is prioritised over batch size; use gradient accumulation if the effective batch gets too small.        |
| Epochs                   | 30–60 with early stopping              | Small dataset → early overfitting is the norm.                                                                     |
| Early stopping criterion | **Validation QWK**, patience ~8        | Never validation loss — loss is dominated by the majority class and is a poor proxy for the metric that matters.   |
| Weight decay             | 1e-4 to 1e-2                           | Meaningful regularisation matters at this data scale.                                                              |
| Label smoothing          | 0.05–0.1                               | Directly addresses known grader label noise; also improves calibration.                                            |
| Seed                     | Fixed and recorded                     | Report mean ± std over ≥3 seeds for any comparison. Single-seed comparisons at this data scale are noise.          |

# **19\. Class Imbalance and Loss Design**

## **19.1 Imbalance strategy, split by objective**

As established in §6.3, the two objectives have very different imbalance profiles, and applying one strategy to both would be a mistake.

| **Technique**                       | **Five-class objective**                                                                 | **Referable objective**                                                | **Verdict**                                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Class-weighted loss                 | Useful — grades 1 and 3 need upweighting.                                                | Unnecessary (≈41/59 split) and actively harmful to calibration.        | Apply to the ordinal loss with **mild** weights (inverse-sqrt frequency, not inverse frequency). |
| Oversampling minority grades        | Useful, with strong augmentation to avoid memorising the ~193 grade-3 images.            | Not needed.                                                            | Balanced-batch sampling, capped so no image is seen more than ~3× per epoch.                     |
| Undersampling grade 0               | Discards ~1,800 useful negatives.                                                        | Harmful.                                                               | **Reject.**                                                                                      |
| Focal loss                          | Helps hard examples; interacts badly with ordinal formulations and degrades calibration. | Degrades calibration, which matters more here than raw discrimination. | **Reject for MVP.** Calibration is a stated requirement (R-11) and focal loss works against it.  |
| Label smoothing                     | Addresses label noise; improves calibration.                                             | Same.                                                                  | **Adopt.**                                                                                       |
| Threshold tuning                    | N/A directly.                                                                            | **The primary tool.**                                                  | **Adopt** — §21.3. This, not resampling, is how the binary objective gets tuned.                 |
| Synthetic minority generation (GAN) | Attractive; risks generating unrealistic pathology.                                      | Not needed.                                                            | **Reject** — research-only, high risk of fabricating lesions.                                    |

_Table 19.1 — Imbalance handling. The key insight is that the clinical objective is tuned by threshold, not by resampling._

## **19.2 Loss function comparison**

| **Loss**                                           | **Treats order?**                                                | **Gives P(referable) directly?**                     | **Calibration**                                  | **Verdict**                                                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Cross-entropy (5-way softmax)                      | No — grade 0 and grade 4 are equally "wrong" for a true grade 2. | Only by summing p₂+p₃+p₄ — never directly optimised. | Good after temperature scaling.                  | Baseline comparator.                                                                                  |
| Weighted cross-entropy                             | No                                                               | Same                                                 | Degraded by weighting.                           | Comparator only.                                                                                      |
| Focal loss                                         | No                                                               | Same                                                 | Poor.                                            | Rejected (§19.1).                                                                                     |
| Regression (MSE on grade) + thresholds             | Yes, implicitly                                                  | Only via a threshold on a scalar.                    | No probability at all.                           | Historically strong for QWK, but yields no calibrated probability — unacceptable given R-10 and R-11. |
| **Cumulative-link / ordinal binary decomposition** | **Yes, explicitly**                                              | **Yes — P(grade ≥ 2) is a head.**                    | Good; each head is a calibratable binary output. | **RECOMMENDED.**                                                                                      |
| Hybrid (ordinal + auxiliary CE)                    | Yes                                                              | Yes                                                  | Good                                             | Optional refinement; small expected gain.                                                             |

## **19.3 The recommended head, in detail**

ENCODER (EfficientNet-B0, ImageNet-initialised)

|

v

GLOBAL POOL --> feature vector f

|

v

ORDINAL HEAD: four independent sigmoid outputs

s1 = P(grade >= 1) "any DR at all"

s2 = P(grade >= 2) "REFERABLE" <-- the clinical output

s3 = P(grade >= 3) "severe or worse"

s4 = P(grade >= 4) "proliferative"

TRAINING TARGETS (from a single label y, no extra annotation needed)

y = 0 -> \[0, 0, 0, 0\]

y = 1 -> \[1, 0, 0, 0\]

y = 2 -> \[1, 1, 0, 0\]

y = 3 -> \[1, 1, 1, 0\]

y = 4 -> \[1, 1, 1, 1\]

LOSS = sum of four binary cross-entropies, mildly class-weighted,

with label smoothing

DECODING to a five-class grade

grade_hat = sum_k \[ s_k > tau_k \] (with monotonic enforcement)

or, better for QWK: expected value E = sum_k s_k , then cut at

thresholds optimised on VALIDATION for QWK

WHY THIS IS THE RIGHT CHOICE HERE

\* Order is encoded in the target structure, not hoped for.

\* Referable DR is a DIRECTLY SUPERVISED, DIRECTLY CALIBRATED output --

it is not a post-hoc sum of softmax probabilities that nothing ever

optimised. This addresses the Sec.5.2 warning at the architecture level.

\* Urgency stratification (Sec.5.4) is free: s3 and s4 already exist.

\* Each head can be temperature-scaled independently.

\* Monotonicity violations (s2 > s1) are a built-in anomaly detector --

a case where they occur is a case worth flagging to a human.

_Figure 19.1 — The ordinal head. This single design choice resolves the objective-conflict raised in §5.2._

## **19.4 Impact of the ordinal structure**

**On training.** Gradients carry ordering information. Misclassifying a grade 4 as grade 0 incurs error on all four heads; as grade 3, on one. The loss surface now reflects clinical reality.

**On QWK.** QWK penalises quadratically by distance. A model whose errors are ordinally local scores substantially better than one whose errors scatter — even at identical top-1 accuracy.

**On calibration.** Four binary outputs are easier to calibrate well than one 5-way softmax, and each can be temperature-scaled against its own reliability curve.

**On severity confusion.** The confusion matrix becomes near-tridiagonal. Off-diagonal mass concentrates adjacent to the diagonal, which is both better clinically and more interpretable in error analysis.

**On monotonicity.** Nothing structurally forces s₁ ≥ s₂ ≥ s₃ ≥ s₄. We enforce it at decode time by taking a running minimum, and we **log every violation** — violations concentrate on ambiguous and out-of-distribution cases, making them a free, zero-cost uncertainty signal.

# **20\. Evaluation Framework**

**One metric is a marketing decision, not an evaluation**

The evaluation reports four metric families because the system has four distinct ways to fail: it can grade poorly, it can miss referrals, it can be overconfident, and it can be too slow to be usable. A single headline number hides three of those.

## **20.1 Metric families**

### **Family 1 — ordinal grading**

| **Metric**                   | **Definition / note**                                  | **Why**                                                                                                                              |
| ---------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Quadratic Weighted Kappa** | κ = 1 − Σwᵢⱼ Oᵢⱼ / Σwᵢⱼ Eᵢⱼ, with wᵢⱼ = (i−j)²/(N−1)². | The APTOS competition metric. Penalises by squared distance, so it rewards ordinal locality — exactly what we designed the head for. |
| Confusion matrix             | Full 5×5, absolute counts (not row-normalised alone).  | The only view that shows _where_ the errors are. Row-normalised percentages hide small-n classes.                                    |
| Per-class recall             | Especially grades 1, 2 and 3.                          | Grade-2 recall is the closest five-class proxy for the clinical objective.                                                           |
| Macro-F1 / weighted F1       | Standard.                                              | Macro treats rare grades as equally important; the gap between macro and weighted quantifies the imbalance effect.                   |
| Adjacent accuracy            | Fraction of predictions within ±1 grade.               | Approximates the level of agreement a second human grader would achieve. A useful sanity ceiling.                                    |

### **Family 2 — clinical screening (the decisive family)**

| **Metric**                                | **Note**                                                                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sensitivity (recall) for referable DR** | Primary. Reported at the constrained operating point with bootstrap 95% CI.                                                                                 |
| **Specificity**                           | Reported at the same operating point. Not maximised independently.                                                                                          |
| **False negatives, in counts**            | Not just a rate. "17 of 550 referable cases were missed" lands differently from "sensitivity 0.969" and is the number a clinician will actually respond to. |
| PPV and NPV                               | Reported **at multiple assumed prevalences** (5%, 10%, 15%, 20%), because both depend on prevalence and the deployment prevalence is unknown. §21.4.        |
| ROC-AUC                                   | Threshold-free discrimination summary.                                                                                                                      |
| PR-AUC                                    | More informative than ROC when the positive class is the minority — relevant if deployment prevalence is much lower than the ~41% in APTOS.                 |
| Binary confusion matrix                   | At the deployment threshold, in counts.                                                                                                                     |
| Urgent-case recall                        | Sensitivity for grade 4 specifically. A missed proliferative case is the worst single outcome the system can produce.                                       |

### **Family 3 — calibration**

- **Reliability diagram** per head, with equal-count bins.
- **Expected Calibration Error (ECE)** before and after temperature scaling.
- **Brier score** for the referable head — a proper scoring rule combining discrimination and calibration in one number.
- **Why it matters operationally:** the abstention mechanism (§22.3) and the escalation thresholds (§27.3) are both defined in terms of probabilities. If the probabilities are not calibrated, those thresholds mean nothing, and the safety mechanism is decorative.

### **Family 4 — operational**

| **Metric**                         | **Target class** | **Note**                                                                |
| ---------------------------------- | ---------------- | ----------------------------------------------------------------------- |
| End-to-end latency P50 / P95 / P99 | TARGET           | Per stage and total. §33.                                               |
| Throughput (images/hour)           | TARGET           | CPU-only and GPU configurations reported separately.                    |
| Peak memory                        | TARGET           | Determines minimum viable hardware.                                     |
| Image rejection rate (Grade C)     | MEASURED         | Feeds the Simulink recapture model directly.                            |
| Recapture success rate             | MEASURED         | Fraction of retries that reach Grade A/B.                               |
| Referral rate                      | MEASURED         | Fraction flagged. Directly determines ophthalmologist load.             |
| Abstention rate                    | MEASURED         | Fraction escalated for low confidence.                                  |
| Reviewer time per case             | TARGET (30 s)    | The requirement that connects model quality to service capacity. §25.4. |

## **20.2 Connecting metrics to screening utility**

MODEL METRIC SERVICE CONSEQUENCE

\------------------------ --------------------------------------------

sensitivity ---> missed sight-threatening disease

(the harm the programme exists to prevent)

specificity ---> referral volume --> ophthalmologist load

\--> whether the programme is affordable

QWK ---> quality of urgency triage (P1 vs P2 ordering)

calibration ---> whether abstention thresholds are meaningful

\--> whether the safety net actually catches

rejection rate ---> patient time, recapture load, camp throughput

latency ---> patients per station per day

reviewer seconds ---> ophthalmologists needed per district

&lt;<< THE metric the whole system optimises &gt;>>

Every model metric in this document terminates in one of these.

A metric that does not is not reported.

_Figure 20.1 — Metric-to-consequence mapping. This is the bridge between Part IV and the Simulink work in Part VII._

# **21\. Referable DR Evaluation and Threshold Selection**

## **21.1 The task**

Binary: grade ≥ 2 → refer. The model output is s₂ = P(grade ≥ 2), a directly supervised, temperature-scaled probability. The deployment decision is s₂ > τ.

## **21.2 Why τ = 0.5 is wrong**

- 0.5 is only optimal under symmetric costs. Costs here are strongly asymmetric: a missed referable case risks vision; a false referral costs a clinic slot.
- 0.5 optimises expected accuracy, which is not the objective. The objective is sensitivity ≥ 0.90 subject to keeping referral volume sustainable.
- The training prevalence (~41% referable) almost certainly differs from deployment prevalence. A threshold calibrated on the former is mis-set for the latter.
- The requirement is expressed as a constraint on sensitivity, so the threshold must be _derived from that constraint_, not from a convention.

## **21.3 Threshold selection procedure**

INPUT: calibrated s2 for every VALIDATION case (never test)

1\. Sweep tau over \[0,1\] at fine resolution.

2\. At each tau compute sensitivity, specificity, PPV, NPV, referral rate,

with bootstrap resampling (>=1000 replicates) for confidence intervals.

3\. Select tau\* = the LARGEST tau such that the LOWER bound of the 95% CI

on sensitivity is >= 0.90.

<<< using the lower CI bound, not the point estimate, is the difference

between a threshold that holds up and one that was lucky >>>

4\. Report the specificity achieved at tau\*, with its CI.

5\. Report the full ROC curve with tau\* marked, so the whole

achievable frontier is visible rather than one cherry-picked point.

6\. Freeze tau\* into the model artefact. Apply unchanged to internal test

and to Messidor-2.

7\. Report the Messidor-2 performance AT THE FROZEN tau\*, and separately

the performance at a Messidor-2-optimal threshold. The GAP between

these two numbers is the honest measure of how well the operating

point transfers -- and it is a headline result, not an appendix.

IF sensitivity >= 0.90 AND specificity >= 0.85 CANNOT BE MET TOGETHER:

\- say so plainly;

\- report the actual frontier;

\- quantify the referral-load consequence of the achievable point in the

Simulink model (Sec.37) -- i.e. "at our operating point the district

needs N reviewers instead of M";

\- identify the ablation most likely to close the gap and state its cost.

This is a stronger position than a number that does not survive scrutiny.

_Figure 21.1 — Threshold selection. Step 7 is the step that distinguishes a validated system from a tuned one._

## **21.4 The trade-off, made concrete**

Worked example at the required operating point (Se = 0.90, Sp = 0.85), across plausible deployment prevalences. **ASSUMPTION-based illustration; recompute with MEASURED values.**

| **Prevalence of referable DR** | **PPV (of those referred, % truly referable)** | **NPV (of those cleared, % truly clear)** | **Referral rate** | **Missed cases per 1,000 screened** |
| ------------------------------ | ---------------------------------------------- | ----------------------------------------- | ----------------- | ----------------------------------- |
| 5%                             | ≈24%                                           | ≈99.4%                                    | ≈18.5%            | 5                                   |
| 10%                            | ≈40%                                           | ≈98.7%                                    | ≈22.5%            | 10                                  |
| 15%                            | ≈51%                                           | ≈98.0%                                    | ≈26.3%            | 15                                  |
| 20%                            | ≈60%                                           | ≈97.1%                                    | ≈30.0%            | 20                                  |

_Table 21.1 — Prevalence sensitivity. Computed from Se = 0.90, Sp = 0.85 by Bayes' rule._

**How to read this table — and how to present it to judges**

At 10% prevalence, **roughly 60% of referrals are false alarms.** That sounds alarming until you read the next column: **only about 1.3% of cleared patients are missed.** For a screening test, that is the correct shape — screening deliberately trades precision for recall, because the follow-up examination is the specific test.

The operational consequence is precise and belongs in the capacity model: at 400 patients/day and 10% prevalence, roughly **90 referrals per day**, of which about 54 are false alarms. Those 54 consume ophthalmologist review time but _not_ clinic appointment slots — because the AI-assisted review filters them before a physical referral is issued. **This is the mechanism by which explainability protects referral capacity**, and it is why §24 and §38 are the same argument seen from two ends.

A team that can state this trade-off numerically, in both directions, is demonstrating exactly the systems thinking the problem statement is asking for.

# **22\. Uncertainty, Calibration and Abstention**

## **22.1 Why raw softmax output is not a confidence**

Deep networks are systematically overconfident. Raw sigmoid or softmax outputs are not probabilities in any calibrated sense — a set of cases at "0.95" may contain 80% positives. Since every safety mechanism in this system is defined as a threshold on a probability, uncalibrated outputs would make the entire safety architecture ornamental.

## **22.2 Method comparison**

| **Method**                     | **Cost**                                                | **Gives**                                                                           | **Verdict**                                                                           |
| ------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Raw sigmoid                    | Free                                                    | Ordering only.                                                                      | Insufficient alone.                                                                   |
| **Temperature scaling**        | Negligible — one scalar per head, fitted on validation. | Well-calibrated probabilities with unchanged ranking (so AUC is preserved exactly). | **Adopt.** Best calibration-per-unit-effort available.                                |
| Isotonic / Platt regression    | Low                                                     | Can fix non-monotone miscalibration.                                                | Fallback if temperature scaling under-corrects; needs more validation data.           |
| MC dropout                     | Moderate (N forward passes)                             | Epistemic uncertainty estimate.                                                     | V1. Useful for out-of-distribution detection specifically.                            |
| Deep ensembles                 | High (N models)                                         | Best uncertainty quality in the literature.                                         | V2 — cost is not justified at MVP.                                                    |
| Test-time augmentation spread  | Low (2–4 passes)                                        | Prediction stability under nuisance transforms.                                     | **Adopt** — the variance across TTA passes is a cheap, meaningful instability signal. |
| Ordinal monotonicity violation | **Free**                                                | Structural inconsistency flag (§19.4).                                              | **Adopt** — free signal, unusual, and genuinely informative.                          |

## **22.3 The abstention mechanism**

A case is escalated to human review WITHOUT an AI grade when ANY holds:

E1 quality grade = C after the retry budget --> P0

E2 s2 falls in the uncertainty band \[tau\* - d, tau\* + d\] --> P0

(d chosen so the band covers a TARGET ~5-10% of cases)

E3 TTA spread exceeds a threshold (prediction unstable) --> P0

E4 ordinal monotonicity violated (s2 > s1, etc.) --> P0

E5 out-of-distribution: quality feature vector or encoder

embedding far from the training distribution

(Mahalanobis distance on the feature vector) --> P0

E6 lesion evidence contradicts the grade:

e.g. grade 0 predicted but many high-confidence red

lesions detected <-- an INDEPENDENT cross-check that does

not rely on the CNN being right --> P0

DESIGN PRINCIPLE

The system is permitted to say "I do not know."

It is NEVER permitted to guess quietly.

E6 IS THE ONE MOST SYSTEMS OMIT

It is the only check where a fully separate evidence pathway can

contradict the classifier. A CNN that is confidently wrong will not

flag itself through E2, E3 or E4. E6 can catch it.

_Figure 22.1 — Abstention rules. E6 is the cross-modal safety net and is the strongest argument for building the lesion module at all._

## **22.4 Tuning the abstention rate**

Abstention has a direct cost: every abstained case consumes reviewer time. The band width d is therefore not a free parameter — it is set by the reviewer capacity established in the Simulink model. The workflow is: measure how sensitivity improves as abstention rate rises; feed the resulting reviewer load into §37; and select the abstention rate at the point where marginal safety gain no longer justifies marginal reviewer load. **This is a joint model/service optimisation, and it is only possible because the Simulink model exists.** It is one of the clearest demonstrations that Simulink is doing real work in this architecture rather than sitting alongside it.

# **23\. Quality-Aware Model Routing**

## **23.1 The principle**

Not every image deserves the same computation. Routing by quality improves the accuracy/latency trade-off and, more importantly, prevents the model from being asked questions its input cannot answer.

quality grade

|

+----+--------------------+-----------------------+

| | |

GRADE A GRADE B GRADE C

| | |

standard path enhanced path REFUSE

model branch prep + conservative CLAHE recapture (Sec.9.5)

single forward pass + TTA (4 passes) then P0 to human

| + wider uncertainty

| band (more caution)

| |

+----------+--------------+

|

s2 within uncertainty band?

|

+-----+-----+

| |

no yes

| |

RESULT ESCALATE (P0) -- optionally a second-opinion model first

V1 OPTION: a second model fine-tuned on synthetically degraded images

handles Grade B. Adopt ONLY if it measurably beats the standard model

on the held-out Grade B subset -- otherwise it is complexity for its

own sake (Sec.64).

_Figure 23.1 — Routing. Note that routing is a safety mechanism first and a performance optimisation second._

## **23.2 Does routing actually help? — the ablation**

Routing must justify itself. Measured on the internal test set, stratified by quality grade:

| **Arm**                                              | **What it tests**                                                   | **MEASURED (Phase 9)** |
| ---------------------------------------------------- | ------------------------------------------------------------------- | ---------------------- |
| No routing — all images through the standard path    | Baseline.                                                           | \_to be filled_        |
| Quality gate only — Grade C refused, no other change | Does refusing bad images alone improve the metrics on what remains? | \_to be filled_        |
| Gate + enhancement for Grade B                       | Does conservative enhancement help borderline images?               | \_to be filled_        |
| Gate + enhancement + TTA for Grade B                 | Does extra compute where quality is low pay off?                    | \_to be filled_        |
| Full routing + abstention                            | Complete system.                                                    | \_to be filled_        |

_Table 23.1 — Routing ablation. Reported as sensitivity/specificity \*\*on the graded subset\*\* together with the coverage (fraction graded) — because a system that refuses half the images and scores brilliantly on the rest has not solved the problem._

**Coverage must always accompany accuracy**

Any metric computed after refusal is conditional on being graded. Reporting sensitivity without reporting what fraction of images were refused is misleading in exactly the direction that flatters the system. Every table in the final results reports **(metric, coverage)** as a pair.

**PART V**

# **Explainability, Reporting and Clinical Safety**

# **24\. Explainable AI**

Explainability here is not a compliance gesture and not a slide. It is the mechanism that makes a 30-second review possible, and therefore the mechanism that makes the district-scale economics work. If the explanation does not reduce reviewer time, it has failed regardless of how good it looks.

## **24.1 What the explanation has to accomplish**

| **Audience**              | **Question they are asking**                   | **What answers it**                                                                                              |
| ------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Reviewing ophthalmologist | "Do I agree, in seconds?"                      | Where to look + what was found + how sure the model is. Spatial precision matters more than saliency aesthetics. |
| Screening technician      | "Is this image good enough, and if not, why?"  | Quality feature attribution, not the DR explanation at all.                                                      |
| SIH / technical judge     | "Is this real, or is it a heatmap on a slide?" | Measured localisation against IDRiD masks, stability under perturbation, a reviewer-time result.                 |
| Engineering team          | "Why did the model get this wrong?"            | Full attribution artefacts stored per case, enabling systematic error analysis (§44).                            |
| Programme governance      | "Can this decision be reconstructed?"          | Model version, thresholds, inputs, and outputs preserved in the audit record.                                    |

## **24.2 A three-layer explanation**

LAYER 3 CLINICAL SUMMARY structured text: what, where, how sure

^ "Referable DR suspected (moderate NPDR

| or worse). Evidence: 12 red lesions,

| 4 within 1 disc diameter of the fovea;

| hard exudates in the superotemporal

| quadrant. Model confidence 0.83

| (calibrated)."

|

LAYER 2 LESION + ANATOMY per-lesion markers with probabilities,

^ optic disc, fovea, vessel map overlay

| <-- SPATIALLY PRECISE, INDEPENDENT of the CNN

|

LAYER 1 GRAD-CAM coarse attention map from the classifier

^ <-- shows the region the MODEL used

|

ORIGINAL + ENHANCED IMAGE

THE KEY ARCHITECTURAL POINT

Layer 1 and Layer 2 come from INDEPENDENT computational pathways.

When they agree, confidence is well founded and the reviewer can move on.

When they DISAGREE -- CAM lights up an area with no detected lesion, or

lesions are found where the CAM is cold -- that is a signal, not a bug,

and it triggers escalation rule E6 (Sec.22.3).

A single-layer explanation cannot produce this signal at all.

_Figure 24.1 — Three-layer explanation. Independence between layers 1 and 2 is what makes the disagreement signal meaningful._

## **24.3 Grad-CAM: mechanism, and its hard limit**

Grad-CAM weights the feature maps of a convolutional layer by the global-average-pooled gradient of the class score with respect to those maps, then takes a ReLU of the weighted sum:

alpha_k^c = (1/Z) \* sum_i sum_j d(y^c) / d(A_ij^k) <- importance of map k

L^c = ReLU( sum_k alpha_k^c \* A^k ) <- class-discriminative map

RESOLUTION ARITHMETIC -- the part that is usually not mentioned

input 512 x 512, standard CNN with total stride 32

\-> final conv feature map = 16 x 16

\-> ONE CAM CELL = 32 x 32 INPUT PIXELS

from Sec.10.3, a microaneurysm at 512 input is roughly 2 px across.

\=> a single Grad-CAM cell spans an area ~250x larger than the lesion.

\=> GRAD-CAM CANNOT POINT AT A MICROANEURYSM. It can point at the

REGION containing one. That is a genuine and useful thing, but it

is not what the word "localisation" implies to a clinician.

WHAT WE DO ABOUT IT

a) run CAM at the highest input resolution the budget allows;

b) also compute CAM at an earlier block (finer grid, less class-specific)

and report both -- the pair is more informative than either;

c) use Grad-CAM++ or HiResCAM where multiple instances of the same

feature appear, which is exactly the DR situation (many small lesions

scattered), since vanilla Grad-CAM tends to fixate on one instance;

d) DO NOT rely on CAM for lesion localisation. That is Layer 2's job.

_Figure 24.2 — Grad-CAM and its resolution ceiling. State this before a judge does._

**Why saying this out loud is a strength, not a weakness**

Almost every DR project presents a Grad-CAM heatmap as _the_ explainability deliverable. A panel that has seen ten such presentations will be looking for the team that understands the limitation.

The correct framing: **"Grad-CAM tells you which region the model used. It cannot tell you which lesion, because its spatial resolution is coarser than the lesions. That is why we built an independent lesion detector, and why the interesting signal is when the two disagree."** That answer demonstrates understanding of the method rather than familiarity with the library call.

## **24.4 Guided Backprop and Guided Grad-CAM — deliberately excluded**

Guided backpropagation produces visually striking, high-resolution saliency images and is widely used. It is excluded here on principle: published sanity checks show that guided backprop and guided Grad-CAM produce **substantially similar-looking maps even when the model weights are randomised** — meaning the map is largely reconstructing edges in the input rather than reflecting what the model learned. In a clinical setting, a compelling explanation that does not depend on the model is precisely the wrong artefact to show a doctor. Plain Grad-CAM, whatever its resolution limits, does depend on the learned weights.

## **24.5 What the reviewer actually sees**

+----------------------------------------------------------------+

| CASE RG-2026-08-25-0147 Right eye (OD) \[P2 REFER\] |

+----------------------------------------------------------------+

| | |

| ORIGINAL (display branch) | EVIDENCE OVERLAY |

| | - Grad-CAM, 35% opacity |

| | - red lesion markers, sized |

| | by detection probability |

| | - exudate contours |

| | - optic disc + fovea markers |

| | - 1-disc-diameter ring at fovea|

+--------------------------------+---------------------------------+

| QUALITY Grade A focus 0.91 illum 0.88 vessels resolvable |

| GRADE 2 (moderate NPDR) P(referable) 0.83 \[calibrated\] |

| P(>=3) 0.21 P(>=4) 0.06 |

| EVIDENCE red lesions 12 (4 within 1 DD of fovea) |

| hard exudates: superotemporal, ~0.4 mm^2 total |

| neovascularisation: not assessed (see limitations) |

| AI SAYS Refer for ophthalmic assessment. Routine priority. |

+----------------------------------------------------------------+

| \[ AGREE \] \[ DISAGREE - regrade \] \[ UNGRADEABLE \] \[ NOTE \] |

+----------------------------------------------------------------+

DESIGN NOTES

\* Grade, probability and evidence are on ONE screen. No clicking to

reach the reason -- clicking is what breaks the 30-second budget.

\* "not assessed" appears explicitly for things we do not detect. A

reviewer must never infer absence from silence.

\* The three action buttons are the feedback loop (Sec.27.4). Capturing

disagreement is how the system learns whether it is trusted.

_Figure 24.3 — Reviewer interface layout. Built in MATLAB App Designer for the MVP; web-based in V1._

## **24.6 The structured rationale, and the four things it must separate**

The generated summary keeps four categories textually distinct, because collapsing them is how an AI system starts making medical claims it cannot support:

| **Category**                | **Example phrasing**                                                                                     | **What it must never become**                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Model evidence**          | "The model's attention concentrated in the inferotemporal quadrant."                                     | A statement about the patient.                                                                   |
| **Detected finding**        | "12 red-lesion candidates detected (mean detection probability 0.71)."                                   | "The patient has 12 microaneurysms." — the detector has a measured false-positive rate.          |
| **Clinical interpretation** | "This pattern is consistent with moderate non-proliferative diabetic retinopathy."                       | "The patient has moderate NPDR." — that is a diagnosis, and this system does not make diagnoses. |
| **Uncertainty and limits**  | "Confidence 0.83. Neovascularisation was not assessed. Minimum detectable lesion in this image ≈ 45 µm." | Silence. Unstated limits get read as absence of findings.                                        |

_Table 24.1 — Rationale categories. The right-hand column is the failure mode each separation prevents._

**The rule for Grad-CAM in text**

Grad-CAM shows correlation between an image region and the model's output. It is not evidence of clinical causality, and the report never phrases it as such. "The model attended to this region" is true. "The disease is in this region because the model looked there" is not.

# **25\. Explainability Validation**

Every project shows heatmaps. Very few measure whether the heatmaps are right or whether they help. This section is the strongest single differentiator available (§70), and it costs a few days.

## **25.1 Four independent questions**

| **Question**                                                            | **Method**                                                                                                                                 | **Metric**                                                                                       | **Data**                  |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------- |
| Does the CAM land on real lesions?                                      | Overlay CAM on IDRiD pixel-level lesion masks.                                                                                             | Pointing game hit rate; IoU of the top-q% CAM region with the lesion mask; energy-in-mask ratio. | IDRiD segmentation subset |
| Is the explanation stable?                                              | Apply small, label-preserving perturbations (±2° rotation, ±3% brightness, mild noise, re-encode) and re-compute.                          | Mean rank correlation / IoU between CAMs across perturbations.                                   | Any held-out set          |
| Is it faithful — does the highlighted region actually drive the output? | Deletion/insertion test: progressively mask the highest-CAM regions and watch the score fall; progressively reveal them and watch it rise. | Area under the deletion curve (lower is better) and insertion curve (higher is better).          | Held-out test             |
| Does it help a human?                                                   | Timed reviewer study: adjudicate cases with and without the explanation layer.                                                             | **Median seconds per case**; agreement with reference grade; self-reported confidence.           | Sample of test cases      |

_Table 25.1 — Explanation validation battery. Question 3 (faithfulness) is the one that separates a real evaluation from a visual one._

## **25.2 Localisation protocol**

1. Run the trained classifier on IDRiD images that carry lesion masks. **Note:** IDRiD grading labels were not used in training (rule S2), so this is a clean cross-dataset test of the explanation, not a self-assessment.
2. Compute Grad-CAM for the predicted class.
3. **Pointing game:** does the CAM maximum fall inside any annotated lesion? Report hit rate, separately per lesion type — the expectation is high for exudates and haemorrhages and materially lower for microaneurysms, and reporting that gradient honestly is more informative than an average.
4. **Energy ratio:** fraction of total CAM energy falling inside lesion masks, versus the fraction expected by chance given the mask area. A ratio near 1 means the CAM is uninformative.
5. Report the same figures for a **randomised-weights control model**. If the control scores nearly as well, the CAM is reading image structure rather than learned pathology, and the explanation is worthless. This control is cheap and is the single most convincing element of the whole battery.

## **25.3 Stability and faithfulness**

**Stability:** an explanation that changes completely when the image is rotated 2° is not describing the disease. We report the distribution of CAM-to-CAM agreement across a fixed perturbation set, and we flag individual cases with low stability for review (this doubles as escalation rule E3).

**Faithfulness (deletion/insertion):** progressively occlude the highest-CAM regions with the local mean and record the referable probability. A faithful explanation produces a steep fall. A CAM that highlights regions whose removal does not change the output is decorative. Insertion runs the reverse. Both curves are reported with the AUC summarised, and both are compared against a random-region baseline.

## **25.4 The reviewer-time study — the study that answers R-05**

DESIGN (small, feasible, and far more convincing than more heatmaps)

N ~= 60-100 cases sampled to span all five grades and both quality

grades A and B, plus a few Grade C for realism.

ARM 1 image only

ARM 2 image + AI grade + confidence

ARM 3 image + AI grade + confidence + FULL explanation layer

Reviewers: ophthalmologist(s) or, if unavailable, trained final-year

optometry/medical raters -- with the substitution stated openly.

Cases presented in randomised order; washout between arms to avoid

recall; timing recorded automatically by the app.

MEASURED

\* median seconds per case, per arm

\* agreement with the reference grade, per arm

\* agreement WITH THE AI, per arm <-- detects automation bias

\* self-reported confidence, per arm

THE TARGET (from the problem statement)

Arm 3 median <= 30 s per case. \[REQUIRED target; MEASURED result TBD\]

THE RESULT THAT WOULD MATTER MOST

If Arm 3 is faster than Arm 1 AND agreement does not fall, the

explanation layer has demonstrated clinical utility. That is a

measured claim about usefulness, and almost no comparable project

will have one.

THE RESULT WE MUST ALSO REPORT

If Arm 2 agreement with the AI is very high but agreement with the

reference grade is LOWER than Arm 1, the AI is inducing automation

bias -- the reviewer is deferring rather than reviewing. That is a

safety finding and it must be published, not buried. The explanation

layer exists partly to counteract exactly this, and Arm 3 vs Arm 2

is the test of whether it does.

_Figure 25.1 — Reviewer study design. The automation-bias check in the final block is the ethically serious part._

## **25.5 When the explanation is wrong**

**CAM highlights a non-lesion region but the grade is correct.** Either the model is using a legitimate global cue (overall vascular appearance), or it has latched onto an artefact. Investigate via the deletion test — if removing the region does not change the score, it was not being used and the CAM itself is at fault.

**CAM is cold where lesions were detected.** Layer 1 / Layer 2 disagreement. Triggers E6. Often occurs when the classifier is grading on a global appearance cue rather than on the lesions — a genuinely important thing to discover.

**CAM is diffuse with no clear focus.** Typical of grade-0 predictions (nothing to point at — appropriate) and of low-confidence predictions (appropriate too). We report CAM concentration as a feature and check that it correlates with confidence; if it does not, something is wrong with one of them.

**CAM highlights the optic disc on a grade-4 prediction.** Ambiguous. Could be genuine disc neovascularisation, or the network anchoring on the brightest object. Resolved by the deletion test plus vessel-density analysis at the disc. This is precisely the sort of case where an independent check is worth having.

# **26\. Automated Report Generation**

## **26.1 Report contents**

| **Field**                                 | **Source**                                      | **Notes**                                                                                   |
| ----------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Case identifier                           | System-generated                                | Pseudonymous. No patient name in the image pipeline (§53).                                  |
| Laterality (OD/OS)                        | Metadata or inferred from disc position (§11.1) | Inferred laterality is flagged as inferred.                                                 |
| Capture timestamp, device ID, operator ID | Acquisition metadata                            | Needed for drift attribution by device (§58).                                               |
| Image quality grade + feature scores      | Quality module                                  | Includes the specific failure reason if Grade B or C.                                       |
| Quality decision                          | Quality module                                  | Proceeded / enhanced / rejected-and-recaptured / ungradeable.                               |
| DR severity prediction                    | Ordinal head                                    | With the ordinal probability vector, not just the argmax.                                   |
| **Referable status**                      | P(grade ≥ 2) vs τ\*                             | The headline. Stated as a referral recommendation, never as a diagnosis.                    |
| Triage priority                           | P1 / P2 / P3 / P0 (§5.4)                        | Determines queue position.                                                                  |
| Calibrated confidence                     | Temperature-scaled                              | With a plain-language band ("high / moderate / low").                                       |
| Detected lesions                          | Lesion module                                   | Counts by type and size band, with mean detection probability.                              |
| Anatomical annotations                    | Localisation module                             | Disc, fovea, vessel map; distance of lesions from the fovea in disc diameters.              |
| Grad-CAM overlay                          | Explanation module                              | With opacity and colourmap fixed across all reports for consistency.                        |
| **Minimum detectable lesion size**        | Computed per image (§14.3)                      | What could _not_ have been found in this image. Rarely reported anywhere; genuinely useful. |
| Recommendation                            | Rule-based from triage level                    | Fixed template text. Never free-form generated.                                             |
| Escalation status                         | Escalation module                               | Whether human review is mandatory, and which rule fired.                                    |
| Model + preprocessing + dataset version   | Artefact metadata                               | Required for reproducibility (R-13).                                                        |
| Validation status                         | Review module                                   | Pending / confirmed / overturned, with reviewer ID and timestamp.                           |
| Limitations block                         | Static + per-case                               | What was not assessed. Always present, never collapsed.                                     |

## **26.2 Language rules**

| **Never write**                      | **Write instead**                                                                                                                                      | **Why**                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| "Diagnosis: moderate NPDR"           | "Screening result: findings consistent with moderate NPDR or worse. Referral recommended."                                                             | A diagnosis requires a clinician and, usually, an examination. This system produces neither.                                            |
| "The patient has 12 microaneurysms." | "12 red-lesion candidates detected (mean detection probability 0.71)."                                                                                 | The detector has a measured false-positive rate. Stating candidates as findings misrepresents it.                                       |
| "No DR detected."                    | "No referable DR detected in this image. This does not exclude disease outside the imaged field or below the detection limit for this image (≈45 µm)." | The most dangerous sentence a screening system can emit is an unqualified negative.                                                     |
| "AI confidence: 94%"                 | "Model confidence 0.94 (calibrated on validation data; see limitations)."                                                                              | An uncontextualised percentage reads as certainty about the patient rather than about the model.                                        |
| "Normal"                             | "No referable findings identified."                                                                                                                    | "Normal" is a clinical judgement about a person. The system evaluates an image.                                                         |
| Free-text generated prose            | Template text with slotted values                                                                                                                      | A generated sentence can be fluent and wrong. Templates cannot hallucinate. There is no LLM anywhere in this pipeline, by design (§64). |

_Table 26.1 — Report language rules. These are enforced by using fixed templates, so compliance is structural rather than dependent on care._

## **26.3 Generation in MATLAB**

Reports are composed as a figure-plus-text layout and exported to PDF via exportgraphics or the MATLAB Report Generator where available. Every report is also written as a structured record (JSON) so that the machine-readable and human-readable forms cannot drift apart. Rendering is deterministic: the same case with the same model version produces a byte-identical report, which makes the audit trail meaningful.

# **27\. Human-in-the-Loop Workflow**

## **27.1 The workflow**

PATIENT REGISTERED (pseudonymous case ID)

|

v

FUNDUS IMAGE CAPTURED ------------------------------+

| |

v |

IMAGE QUALITY CHECK |

| |

+----+--------+ |

| | |

A/B C (ungradeable) |

| | |

| retries left? ---- yes ---> OPERATOR |

| | GUIDANCE -------+

| no

| |

| v

| P0 CANNOT ASSESS ------------------+

| |

v |

ENHANCE (B only) -> ANATOMY -> LESIONS |

| |

v |

DR MODEL -> CALIBRATE -> ABSTENTION CHECK |

| | |

| abstain (E1-E6) |

| | |

| +-------------+

| |

v v

EXPLANATION + REPORT ESCALATED QUEUE

| |

v |

TRIAGE: P1 / P2 / P3 |

| |

+----+-------------+ |

| | |

P3 confident P1 / P2 |

| | |

auto-clear +------------------------->+

\+ 5% audit |

sample v

| TELEMEDICINE QUEUE (priority ordered)

| |

+--------------------------->+

|

v

OPHTHALMOLOGIST REVIEW

|

+-----------+-----------+

| | |

AGREE DISAGREE UNGRADEABLE

| | |

v v v

FINAL REGRADE RECALL

DECISION (reviewer PATIENT

| grade wins)

| |

+-----+-----+

|

v

FEEDBACK STORE -> Sec.44 error analysis

Sec.58 drift monitoring

_Figure 27.1 — Complete human-in-the-loop workflow. Every path terminates either in a human decision or in an audited auto-clear._

## **27.2 Responsibility allocation**

| **Actor**                      | **Responsible for**                                                                                                                                                            | **Explicitly NOT responsible for**                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **AI system**                  | Quality assessment; enhancement; lesion and anatomy detection; severity and referable prediction with calibrated confidence; explanation; report; triage priority; abstention. | Diagnosis. Treatment. Overriding a human. Deciding that a case needs no human oversight in the safety-first configuration. |
| **Screening technician**       | Patient registration; image capture; responding to quality guidance; ensuring both eyes are imaged; local escalation of obviously distressed patients.                         | Interpreting the AI grade. Deciding referrals. Overriding an ungradeable verdict.                                          |
| **Reviewing ophthalmologist**  | Adjudicating every P0/P1/P2 case and the P3 audit sample; final referral decision; overriding the AI in either direction; flagging systematic model problems.                  | Re-photographing. Being available synchronously — review is asynchronous by design.                                        |
| **District programme manager** | Capacity planning using the Simulink outputs; monitoring queue and backlog; equipment and training interventions when recapture rates rise.                                    | Clinical decisions. Model changes.                                                                                         |
| **Engineering team**           | Model versioning; drift monitoring; incident response; validation; rollback.                                                                                                   | Clinical decisions. Silent model updates in a live programme.                                                              |

## **27.3 Escalation rules**

| **Rule** | **Trigger**                                          | **Route**                                                        | **Rationale**                                                                                |
| -------- | ---------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **E1**   | Quality Grade C after retry budget exhausted.        | P0 → reviewer, with original image.                              | Ungradeable is a clinical finding (media opacity, cataract), not merely a technical failure. |
| **E2**   | P(referable) inside the uncertainty band around τ\*. | P0 → reviewer.                                                   | The model is on the fence at exactly the boundary that matters most.                         |
| **E3**   | TTA spread above threshold.                          | P0 → reviewer.                                                   | Prediction unstable under nuisance transforms.                                               |
| **E4**   | Ordinal monotonicity violated.                       | P0 → reviewer.                                                   | Structurally inconsistent output; free signal (§19.4).                                       |
| **E5**   | Out-of-distribution by feature-space distance.       | P0 → reviewer + engineering alert.                               | New camera, new population, or a non-fundus image. Also a drift signal.                      |
| **E6**   | Lesion evidence contradicts the grade.               | P0 → reviewer.                                                   | The only rule where an independent pathway can catch a confidently wrong classifier (§22.3). |
| **E7**   | P(grade ≥ 4) above the urgent threshold.             | P1 → priority queue, same-day target.                            | Suspected proliferative DR is time-critical.                                                 |
| **E8**   | Reviewer overrides the AI by ≥ 2 grades.             | Logged for engineering review; case retained for error analysis. | Large disagreements are the highest-information training signal available.                   |
| **E9**   | Any pipeline stage throws an exception.              | P0 → reviewer, with a diagnostic record.                         | Fail-safe default is always "human decides", never "system guesses" (§28).                   |

_Table 27.1 — Escalation rules. Their combined effect is that no patient can be auto-cleared through any failure path._

## **27.4 Handling disagreement**

**Reviewer decision is authoritative, always.** No exception, no override path. The AI grade is retained alongside it, never replaced, so both are available for analysis.

**Disagreements are stratified and analysed.** False negatives (AI cleared, reviewer referred) are the priority class and are examined individually, not just counted.

**Systematic disagreement triggers investigation.** If the disagreement rate on any subgroup — a device, a site, a quality grade — exceeds its baseline by a defined margin, an engineering investigation opens automatically (§58).

**Reviewer grades are not automatically used as training labels.** Tempting and wrong without care. Reviewer grades come from AI-assisted review and are therefore anchored by the AI's own suggestion (automation bias, §25.4). Feeding them back directly creates a confirmation loop in which the model trains on its own predictions. Any retraining on reviewer labels uses only **independently re-graded** cases (§57).

**The feedback-loop trap**

This is subtle and it has caught deployed systems. If the model says "grade 2", the reviewer agrees 90% of the time, and those agreed labels are used for retraining, the model is being trained on a slightly noisier copy of itself. Performance on the reference standard degrades while apparent agreement improves — the metrics look better as the system gets worse. The defence is a blinded re-grading protocol for any data that will be used as training labels.

# **28\. Clinical Safety Architecture**

## **28.1 The safety principle**

**Fail-safe default**

Every failure mode in this system resolves to **"a human looks at it."** There is no failure path in which a patient is auto-cleared because something broke. This is enforced structurally: auto-clear requires a _positive_ set of conditions (Grade A/B, confident, consistent, in-distribution, no exceptions raised), so the absence of any condition — including the absence caused by a crash — routes to review.

## **28.2 Hazard analysis**

| **Hazard**                                  | **Cause**                                                        | **Severity**                                 | **Detection**                                                  | **Mitigation**                                                                                                                                                      |
| ------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Referable case cleared** (false negative) | Model error; subtle disease; low-quality image graded anyway.    | **Critical** — potential vision loss.        | Reviewer audit sample; longitudinal follow-up where available. | Sensitivity-constrained threshold; abstention; E6 cross-check; quality gate; audit sampling of auto-cleared cases; conservative "does not exclude disease" wording. |
| Ungradeable image graded confidently        | Quality module fails; quality/severity confound (§9.6).          | **Critical** — false reassurance.            | Audit of rejection rate by true grade.                         | Vessel-resolvability gate; synthetic-degradation training; Grade C refusal is structural, not advisory.                                                             |
| Urgent (PDR) case queued as routine         | Grade-4 under-prediction.                                        | **High** — treatable disease delayed.        | Grade-4 recall tracked separately.                             | E7 urgent escalation; lesion-based large-haemorrhage rule as an independent trigger; P1 queue jumps.                                                                |
| Over-referral collapses capacity            | Threshold too aggressive; domain shift raises the positive rate. | High — programme-level failure.              | Referral rate monitored daily against baseline.                | Referral-rate alarm; Simulink capacity model; threshold reviewed against measured prevalence.                                                                       |
| Explanation misleads the reviewer           | CAM highlights a non-lesion; reviewer anchors on it.             | High.                                        | Reviewer study (§25.4); automation-bias check.                 | Three-layer explanation; explicit "not assessed" statements; faithfulness testing; reviewer training.                                                               |
| Model silently degrades after deployment    | New camera, new population, seasonal case mix.                   | High.                                        | Drift monitors (§58).                                          | Input and prediction drift detection; audit-sample performance tracking; rollback capability.                                                                       |
| Wrong preprocessing served with a model     | Version mismatch during deployment.                              | High — silent accuracy collapse.             | Runtime hash assertion.                                        | Preprocessing hash embedded in the artefact; inference refuses to start on mismatch.                                                                                |
| Case lost during synchronisation            | Network failure mid-upload.                                      | Medium.                                      | Reconciliation report (local queue vs district record).        | Idempotent upload with case UUID; local queue persists until acknowledged; daily reconciliation.                                                                    |
| Patient identity mismatch                   | Wrong case ID at capture.                                        | **Critical** — wrong result to wrong person. | Laterality and demographic consistency checks.                 | Barcode/ID scan at registration; confirm-before-capture step; fellow-eye consistency check flags implausible pairs.                                                 |

_Table 28.1 — Hazard analysis. Note that two of the three Critical hazards are non-model failures (identity and quality), which is typical of clinical software._

## **28.3 Audit sampling of auto-cleared cases**

P3 auto-clear is the only path where a patient receives an outcome without a human seeing the image. It therefore carries a mandatory audit: a **random 5% sample** (configurable, and higher during initial deployment) of auto-cleared cases is queued for reviewer confirmation. This is the only mechanism that can detect a rising false-negative rate in production, because false negatives are otherwise invisible by construction — nobody looks at the cases the system said were fine. The sample rate is a direct trade between reviewer load and detection latency, and it is one of the parameters swept in the Simulink model (§40).

## **28.4 Model integrity and rollback**

- Model artefacts are hashed and signed. Inference verifies the hash at load and refuses to run on mismatch.
- Every prediction record stores the model hash, so any result can be traced to an exact artefact.
- The previous model version remains deployed and loadable at every site. Rollback is a configuration change, not a redeployment.
- A rollback is triggered automatically if audit-sample sensitivity falls below a defined floor, or manually by the engineering lead. **Rollback authority is defined before deployment, not during an incident.**

**PART VI**

# **System Architecture and Rural Deployment**

# **29\. System Architecture**

The architecture is deliberately unfashionable: a single-process pipeline on a laptop, a small district server, and a human network in between. The complexity in this system is clinical and operational, not infrastructural, and the architecture reflects that.

## **29.1 Deployment topology**

\============ SCREENING NODE (PHC / camp) ============ OFFLINE-CAPABLE

Portable fundus camera --USB/WiFi--> Laptop

|

+------------------------------------+------------------------------+

| MATLAB pipeline (compiled, MATLAB Runtime -- no licence needed) |

| quality -> enhance -> anatomy -> lesions -> model -> explain |

| -> report -> triage |

| MATLAB App Designer UI (technician-facing) |

| SQLite case store + filesystem image store |

| Sync agent (store-and-forward, idempotent, resumable) |

+-------------------------------------------------------------------+

|

intermittent, low-bandwidth, uplink-constrained

|

v

\============ DISTRICT NODE (district hospital) ============ ALWAYS ON

+-------------------------------------------------------------------+

| PostgreSQL (cases, predictions, reviews, audit) |

| Object/file storage (images, overlays, reports) |

| Priority queue service (P1 > P2 > P0 > P3-audit) |

| Reviewer web application |

| Dashboards + drift monitors |

| Model registry + distribution |

+-------------------------------------------------------------------+

|

+-----------------+-----------------+

| |

OPHTHALMOLOGIST PROGRAMME MANAGER

(browser, async) (dashboard)

\============ ENGINEERING (offline, not in the service path) ============

Training, evaluation, Simulink capacity modelling, model registry

WHAT IS DELIBERATELY ABSENT

no Kubernetes . no message broker . no microservices . no service mesh

no vector database . no feature store . no cloud dependency . no LLM

RATIONALE

A screening node is ONE laptop with ONE user. A district node serves

tens of sites and a handful of reviewers. Neither is a distributed

systems problem. Adding one would add failure modes and no capability.

(Sec.64)

_Figure 29.1 — Deployment topology. Scaling is horizontal replication of the screening node, not decomposition of the software._

## **29.2 Component boundaries**

| **Boundary**            | **Where it sits**                                                                                                                                     | **Why there**                                                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MATLAB boundary**     | Everything from image decode to report generation runs inside MATLAB (compiled).                                                                      | The mandated stack is genuinely well-matched here, and keeping the whole image path in one runtime removes an entire class of serialisation and version-mismatch bugs. |
| **Simulink boundary**   | Entirely offline. Simulink models the _service_, consumes measured latencies, and produces capacity recommendations. It is never in the request path. | A discrete-event simulation of a queue has no business executing while a patient waits. Its outputs are planning artefacts.                                            |
| **Edge/cloud boundary** | All inference at the edge. The district node stores, queues and presents; it does not infer.                                                          | Connectivity is the least reliable component in the system. Nothing patient-facing may depend on it.                                                                   |
| **Human boundary**      | After triage, before any patient-facing outcome except audited P3 auto-clear.                                                                         | Safety (§28).                                                                                                                                                          |
| **Failure boundary**    | Each pipeline stage is independently wrapped; a stage failure degrades to P0.                                                                         | Prevents partial failure from producing a partial, unlabelled result (§54).                                                                                            |
| **Security boundary**   | At the screening-node disk (encryption at rest) and at the sync channel (TLS + auth).                                                                 | These are the two places patient data can leave a controlled context (§52).                                                                                            |

## **29.3 Synchronous versus asynchronous**

| **Operation**                | **Mode**                        | **Budget / note**                                                                                                                                   |
| ---------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality assessment           | Synchronous, blocking           | **TARGET < 1 s.** The technician is waiting with the patient in the chair; anything slower breaks the capture rhythm and drives recapture failures. |
| Full analysis + report       | Synchronous                     | **TARGET P95 ≤ 8 s CPU.** Fits inside the gap while the technician sets up the fellow eye.                                                          |
| Local persistence            | Synchronous                     | Must complete before the case is considered captured.                                                                                               |
| Upload to district           | Asynchronous, queued, resumable | May take hours or days. Never blocks the clinic.                                                                                                    |
| Reviewer adjudication        | Asynchronous                    | Target turnaround: same day for P1, 72 h for P2 (**ASSUMPTION**, swept in §40).                                                                     |
| Decision return to site      | Asynchronous                    | Pulled on next connectivity window.                                                                                                                 |
| Drift monitoring, dashboards | Batch                           | Daily.                                                                                                                                              |

## **29.4 Alternatives considered and rejected**

| **Alternative**                                 | **Attraction**                                                            | **Why rejected**                                                                                                                                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloud inference, thin client at the site        | Central model updates; no edge compute needed; simplest deployment story. | **Fails the core constraint.** With intermittent connectivity, no result is produced while the patient is present, so the recapture loop breaks entirely. Also uploads full-resolution images over the worst link in the system. |
| Hybrid: local quality check, cloud grading      | Preserves the recapture loop; lighter edge compute.                       | Still no same-visit result. Grading is not the expensive part — the model is a few hundred milliseconds. Splitting the pipeline adds a network dependency mid-flow for negligible saving.                                        |
| Fully autonomous, no human review               | Maximum throughput; the "impressive" answer.                              | Rejected on safety and on regulatory reality (§28, ADR-14). Also removes the feedback signal the system needs to improve.                                                                                                        |
| Microservice decomposition                      | Independent scaling; familiar to reviewers of modern architectures.       | A screening node is one process serving one user. Decomposition would add IPC, versioning and failure modes to buy nothing. §64.                                                                                                 |
| Python backend with MATLAB only for prototyping | Larger ecosystem; easier deployment tooling.                              | Contradicts the problem statement, and MATLAB Compiler with the free MATLAB Runtime is a genuinely adequate deployment path. ADR-01.                                                                                             |

# **30\. Image Lifecycle**

## **30.1 The twenty-one stages**

| **#** | **Stage**                                               | **Where**     | **Sync** | **Failure →**                                                |
| ----- | ------------------------------------------------------- | ------------- | -------- | ------------------------------------------------------------ |
| 1     | Patient registration (pseudonymous ID)                  | Site          | Sync     | Block — no capture without an ID                             |
| 2     | Image acquisition                                       | Site / camera | Sync     | Retry capture                                                |
| 3     | Image validation (decodable, plausible dimensions, RGB) | Site          | Sync     | Reject, recapture                                            |
| 4     | Quality assessment                                      | Site          | Sync     | Grade C → recapture / P0                                     |
| 5     | Enhancement (Grade B)                                   | Site          | Sync     | Fall back to unenhanced + flag                               |
| 6     | Quality re-evaluation                                   | Site          | Sync     | Still C → P0                                                 |
| 7     | Field mask + anatomy localisation                       | Site          | Sync     | Low confidence → proceed without anatomical context, flagged |
| 8     | Vessel segmentation                                     | Site          | Sync     | Degrade — disc localisation loses one cue                    |
| 9     | Lesion detection                                        | Site          | Sync     | Degrade — explanation loses layer 2, flagged                 |
| 10    | DR classification (ordinal)                             | Site          | Sync     | **P0** — no grade without the model                          |
| 11    | Referable determination at τ\*                          | Site          | Sync     | Inherits 10                                                  |
| 12    | Calibration + abstention checks                         | Site          | Sync     | Abstain → P0                                                 |
| 13    | Explanation generation                                  | Site          | Sync     | Report without CAM, flagged; grade still valid               |
| 14    | Report generation                                       | Site          | Sync     | Retry once, then P0                                          |
| 15    | Local persistence (SQLite + files)                      | Site          | Sync     | **Hard stop** — never proceed on a failed write              |
| 16    | Triage assignment                                       | Site          | Sync     | Default to P0 (most conservative)                            |
| 17    | Queue for upload                                        | Site          | Async    | Retry with backoff, indefinitely                             |
| 18    | Upload + district ingest                                | Network       | Async    | Idempotent retry by case UUID                                |
| 19    | Reviewer adjudication                                   | District      | Async    | Escalate on SLA breach                                       |
| 20    | Decision returned to site                               | Network       | Async    | Pull on next window                                          |
| 21    | Audit log + feedback store                              | Both          | Async    | Never dropped — audit writes are durable                     |

_Table 30.1 — Image lifecycle. Note that only stages 10, 15 and 16 can hard-stop; everything else degrades gracefully with a flag._

## **30.2 Sequence view**

Technician Camera MATLAB Pipeline Local Store Sync District Ophthalmologist

| | | | | | |

|--register->| | | | | |

| |--image------->| | | | |

| | |--quality | | | |

|<-----------------GRADE C: "too dark"---------| | | |

|--recapture>| | | | | |

| |--image------->| | | | |

| | |--quality: A | | | |

| | |--anatomy | | | |

| | |--lesions | | | |

| | |--classify | | | |

| | |--calibrate | | | |

| | |--explain | | | |

| | |--report-------->| | | |

|<---------------"P2 refer, queued"------------| | | |

| | | |--enqueue-->| | |

| ... next patient ... | | | |

| | | | |--sync-->| |

| | | | | |--priority--->|

| | | | | | queue |

| | | | | |<--decision---|

| | | |<---pull----|<--------| |

|<--"case 0147 confirmed"----------------------| | | |

CRITICAL PROPERTY: everything left of the "sync" column completes

while the patient is present. Everything right of it may take days.

The patient never waits on the network.

_Figure 30.1 — Sequence diagram. The vertical split at the sync boundary is the central design property of the deployment._

# **31\. Rural Deployment Architecture**

## **31.1 Constraints, and what each one forces**

| **Constraint**    | **Reality**                                                                   | **Architectural consequence**                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Connectivity      | Intermittent; often absent for hours or days. Uplink far worse than downlink. | Offline-first is mandatory. Upload is store-and-forward, selective and compressed.                                                               |
| Bandwidth         | **ASSUMPTION** 0.25–2 Mbps when present.                                      | Full-resolution upload of every image is infeasible (§31.3). Tiered upload strategy required.                                                    |
| Power             | Interruptions are routine.                                                    | Every write is transactional; a mid-case power loss must not corrupt the case store. UPS recommended for the laptop.                             |
| Compute           | Mid-range laptop, GPU unlikely. **ASSUMPTION.**                               | Model must run acceptably on CPU. Drives the EfficientNet-B0 choice and the latency budget.                                                      |
| Staff             | Technician-level, high turnover.                                              | UI must be near-zero-training. Quality feedback must be instructive, not diagnostic. No configuration exposed at the site.                       |
| Cameras           | Portable, varied models, varied optics.                                       | Device ID recorded per image; drift monitored per device (§58). Field-angle configured per device for the pixels-per-degree computation (§12.4). |
| Environment       | Dust, heat, ambient light in a tent.                                          | Quality module must handle flare and ambient contamination. Physical setup guidance is part of the operator training, not the software.          |
| Patient behaviour | Long travel; will not return for a second visit.                              | **Same-visit result is non-negotiable.** This single fact eliminates every cloud-inference architecture.                                         |

## **31.2 Placement decisions**

| **Function**           | **Local device** | **Edge (site laptop)** | **District server** | **Cloud**         |
| ---------------------- | ---------------- | ---------------------- | ------------------- | ----------------- |
| Image capture          | **Yes**          | —                      | —                   | —                 |
| Quality assessment     | —                | **Yes**                | —                   | No                |
| Enhancement            | —                | **Yes**                | —                   | No                |
| Anatomy + lesions      | —                | **Yes**                | —                   | No                |
| DR inference           | —                | **Yes**                | —                   | No                |
| Explanation + report   | —                | **Yes**                | —                   | No                |
| Case store (primary)   | —                | **Yes**                | replica             | No                |
| Queue + prioritisation | —                | —                      | **Yes**             | No                |
| Reviewer interface     | —                | —                      | **Yes**             | optional          |
| Dashboards + drift     | —                | —                      | **Yes**             | optional          |
| Model registry         | —                | cached copy            | **Yes**             | optional          |
| Training               | —                | —                      | —                   | **Yes / offline** |

_Table 31.1 — Placement matrix. The cloud column is almost entirely empty, and that is the point: no cloud dependency exists in the patient path._

## **31.3 Bandwidth arithmetic — why tiered upload is mandatory**

ASSUMPTIONS

400 patients/day, 2 images/patient -> 800 images/day

native JPEG ~3 MB/image -> 2.4 GB/day

referral + uncertain + ungradeable -> ~25% of cases

NAIVE: upload everything at full resolution

2.4 GB = 19,200 Mbit

@ 2 Mbps -> 9,600 s ~= 2.7 h feasible overnight

@ 0.256 Mbps-> 75,000 s ~= 20.8 h NOT FEASIBLE

(exceeds the day it was generated in)

SELECTIVE: upload only the ~25% that need review, full resolution

200 x 3 MB = 600 MB = 4,800 Mbit

@ 0.256 Mbps -> 18,750 s ~= 5.2 h marginal, fragile

TIERED (RECOMMENDED)

tier 1 metadata + report JSON + thumbnail ~50 KB/case, ALL cases

tier 2 quality-preserving 1536 px JPEG + overlay ~600 KB/case,

REVIEW cases only (~25%)

tier 3 full-resolution original,

ON DEMAND when the reviewer requests it, or opportunistically

when bandwidth is abundant

daily volume = 400 x 50 KB + 200 x 600 KB

\= 20 MB + 120 MB = 140 MB = 1,120 Mbit

@ 0.256 Mbps -> 4,375 s ~= 1.2 h FEASIBLE

@ 2 Mbps -> 560 s ~= 9 min

\>>> A 17x REDUCTION IN UPLOAD VOLUME, ACHIEVED BY DECIDING WHAT THE

\>>> REVIEWER ACTUALLY NEEDS TO SEE FIRST. This is the single highest-

\>>> leverage deployment decision in the document.

VALIDATION REQUIRED

Confirm that 1536 px + quality-preserving JPEG does not degrade

REVIEWER agreement -- using the Sec.25.4 study protocol with

compressed images as an additional arm. Compression that saves

bandwidth but costs sensitivity is a false economy.

_Figure 31.1 — Tiered upload. The validation note is essential: the compression level is a clinical parameter, not an IT one._

# **32\. Offline-First Operation**

## **32.1 Behaviour without connectivity**

| **Function**                                        | **Offline behaviour**                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image capture                                       | Unaffected.                                                                                                                                                                                                                                                                                             |
| Quality assessment                                  | Unaffected — fully local.                                                                                                                                                                                                                                                                               |
| Enhancement, anatomy, lesions, grading, explanation | Unaffected — fully local.                                                                                                                                                                                                                                                                               |
| Report generation                                   | Unaffected. Printed or shown on screen if needed.                                                                                                                                                                                                                                                       |
| Triage assignment                                   | Unaffected.                                                                                                                                                                                                                                                                                             |
| Case queueing                                       | Cases accumulate in the local durable queue, with no size limit other than disk.                                                                                                                                                                                                                        |
| Reviewer adjudication                               | **Deferred.** The technician informs the patient that a specialist review will follow, and the site records the contact and follow-up method.                                                                                                                                                           |
| Urgent (P1) cases                                   | **Escalated out-of-band.** The report is printed and the patient is given a direct referral letter to the district hospital. The system does not depend on the network to move an urgent case — a phone call and a piece of paper are more reliable than the uplink, and the design says so explicitly. |
| Model updates                                       | Deferred until the next connectivity window; the site continues on its current model version.                                                                                                                                                                                                           |

**The out-of-band urgent path is a design requirement, not a workaround**

Any system whose urgent-case path depends on the least reliable component in the deployment has a design flaw. The P1 path is: print the report, hand the patient a referral letter, phone the district hospital if a line is available. The digital record follows when it can. This costs nothing to implement and removes an entire class of catastrophic failure.

## **32.2 Synchronisation protocol**

LOCAL QUEUE ENTRY

case_uuid (generated at the site; globally unique; the idempotency key)

payload_tier 1 | 2 | 3

state PENDING | IN_FLIGHT | ACKED | FAILED_PERMANENT

attempt_count, last_attempt_at, next_attempt_at

payload_sha256 integrity check

priority P1 > P0 > P2 > P3-audit

ON CONNECTIVITY DETECTED

1\. probe: small authenticated request; measure achievable bandwidth

2\. order the queue by priority, then by age

3\. for each entry, subject to a bandwidth budget:

upload with case_uuid as the idempotency key

district responds 200 (accepted) or 409 (already have it)

BOTH mark the entry ACKED <-- this is what makes retries safe

4\. pull: reviewer decisions, model updates, config changes

5\. reconcile: compare local case count with the district's count for

this site and this date range; report any discrepancy to the operator

CONFLICT RULES

\* reviewer decision always wins over the local AI grade

\* a local record is never overwritten -- the reviewer decision is

ADDED as a new row, preserving both

\* clock skew is handled by using server-assigned sequence numbers

for ordering, not device timestamps

RETRY

exponential backoff with jitter, capped at ~30 min

no permanent failure except on integrity mismatch, which raises an alert

partial uploads resume by byte range where the transport supports it

DUPLICATE PREVENTION

The case_uuid is generated ONCE at capture and never regenerated.

Every retry carries the same key. The district treats ingest as an

upsert. This is the entire duplicate-prevention mechanism, and it is

sufficient -- which is why no message broker is needed.

_Figure 32.1 — Sync protocol. Idempotency by client-generated UUID removes the need for any queueing infrastructure._

## **32.3 Reconciliation**

A daily reconciliation report compares local case counts against district-acknowledged counts per site and date. Any discrepancy is surfaced to the site operator and to the programme manager. This is the mechanism that catches the silent loss of a case — the kind of failure that no exception is ever thrown for, and which is otherwise discovered only when a patient asks about a result that does not exist.

# **33\. Edge Deployment and Performance Engineering**

## **33.1 Target hardware profiles**

| **Profile**  | **Spec (assumed)**                        | **Expected role**                          | **Expected throughput** |
| ------------ | ----------------------------------------- | ------------------------------------------ | ----------------------- |
| **Minimum**  | 4-core CPU, 8 GB RAM, no GPU, SSD         | Low-volume PHC                             | TARGET: ≥ 6 images/min  |
| **Standard** | 8-core CPU, 16 GB RAM, no GPU, SSD        | Typical screening site                     | TARGET: ≥ 12 images/min |
| **Camp**     | 8-core CPU, 16 GB RAM, entry GPU (4–6 GB) | High-volume camp                           | TARGET: ≥ 40 images/min |
| **District** | Server CPU, 32 GB+, optional GPU          | Batch re-processing, not primary inference | N/A                     |

_Table 33.1 — Hardware profiles. All throughput figures are TARGETs; MEASURED values replace them in Phase 9._

## **33.2 Latency budget**

| **Stage**                           | **CPU target (ms)** | **GPU target (ms)** | **Note**                                                                                   |
| ----------------------------------- | ------------------- | ------------------- | ------------------------------------------------------------------------------------------ |
| Decode 4288×2848 JPEG               | 150–400             | 150–400             | CPU-bound either way. Largest single fixed cost; can be overlapped with the previous case. |
| Field mask + crop                   | 30–80               | 30–80               | Cheap morphology.                                                                          |
| Quality features                    | 60–150              | 60–150              | Includes a coarse-scale vessel pass.                                                       |
| Illumination normalisation          | 40–120              | 20–50               | Large-kernel filter; separable approximations help.                                        |
| Resize to model input               | 20–60               | 20–60               | —                                                                                          |
| CLAHE (CV branch)                   | 30–80               | 10–30               | adapthisteq.                                                                               |
| Vessel segmentation (classical)     | 200–500             | 80–200              | Multi-scale fibermetric is the cost driver.                                                |
| Optic disc + fovea                  | 80–250              | 50–120              | Reuses the vessel map.                                                                     |
| Lesion detection                    | 400–1500            | 150–500             | Candidate generation dominates; scales with image area.                                    |
| CNN forward (EfficientNet-B0 @512²) | 200–600             | 15–40               | Single pass.                                                                               |
| TTA (×4, Grade B only)              | 800–2400            | 60–160              | Conditional.                                                                               |
| Grad-CAM                            | 400–1200            | 30–80               | Roughly one forward + one backward pass.                                                   |
| Report rendering                    | 200–500             | 200–500             | Figure composition and PDF export.                                                         |
| Persistence                         | 50–150              | 50–150              | SQLite transaction + file writes.                                                          |
| **Total (Grade A, typical)**        | **≈1.9–5.6 s**      | **≈0.9–2.3 s**      | **TARGET: P95 ≤ 8 s CPU, ≤ 3 s GPU**                                                       |

_Table 33.2 — Latency budget. All values are TARGETs derived from expected complexity, to be replaced by MEASURED P50/P95/P99 in Phase 9._

## **33.3 Optimisation levers, in order of expected value**

1. **Overlap decode with the previous case.** The technician needs ~30 s per capture; decode of the next image can run during that time. Effectively removes 150–400 ms from the perceived latency for free.
2. **Run the quality gate first and cheaply.** A Grade-C image costs ~300 ms instead of ~4 s, because nothing downstream runs. If 10% of images are Grade C, this alone is a meaningful average saving — and the gate exists anyway.
3. **Compute lesion detection at a reduced but still adequate scale.** Candidate generation scales with pixel count. Halving the linear dimension quarters the cost. Validate against the lesion-survival criterion (§10.4) to find the floor.
4. **Make Grad-CAM conditional.** Generate it only for cases that will be reviewed (P0/P1/P2 plus the audit sample), not for confidently-cleared P3 cases. Saves ~0.4–1.2 s on the majority of cases at zero clinical cost.
5. **Cache the model in memory across cases.** Obvious, and forgetting it is a common and expensive mistake in compiled MATLAB applications.
6. **Restrict TTA to Grade B.** Already in the routing design (§23).
7. **GPU where available** — but the system is designed to be acceptable without one, because procurement reality says most sites will not have one.

## **33.4 MATLAB deployment options**

| **Option**                                        | **What it gives**                                                                              | **Cost**                                                                                               | **Verdict**                                                                                                                                            |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **MATLAB Compiler → standalone + MATLAB Runtime** | A standalone executable; the Runtime is free to redistribute, so sites need no MATLAB licence. | Compiler licence; large Runtime install; not all functions are deployable — **verify coverage early**. | **RECOMMENDED for site deployment.** This is the path that makes rural deployment economically real.                                                   |
| MATLAB Production Server                          | Scalable server-side execution with request management.                                        | Server licence; requires connectivity.                                                                 | Not for the edge. Possible at the district node in V1 if server-side re-processing is needed.                                                          |
| GPU Coder → CUDA                                  | Generates optimised CUDA for the inference path.                                               | Coder licence; GPU required; adds a build step.                                                        | Only if GPU sites exist and profiling shows inference is the bottleneck — which the latency budget suggests it is not.                                 |
| MATLAB Coder → C/C++                              | Portable C for embedded targets.                                                               | Restricted function subset; substantial porting effort.                                                | V2, only if embedded hardware becomes a requirement.                                                                                                   |
| ONNX export                                       | Model portability to other runtimes.                                                           | Preprocessing does not travel with the model — a serious hazard (§18.1).                               | Useful for _comparison_ against external implementations. Not the deployment path, precisely because the preprocessing/model coupling would be broken. |
| MATLAB App Designer packaged app                  | Fast GUI development.                                                                          | Requires MATLAB unless compiled.                                                                       | MVP UI, then compiled for deployment.                                                                                                                  |

_Table 33.3 — Deployment options. The Compiler + free Runtime combination is what makes a MATLAB-based rural deployment viable, and is worth stating explicitly to judges who may assume otherwise._

## **33.5 Throughput and the real bottleneck**

PER SCREENING STATION, 8-hour day

AI processing : ~12 images/min (Standard profile, CPU)

\= 720 images/h = 5,760 images/day

Image capture : ~2 images per patient, ~6 min/patient

\= 10 patients/h = 80 patients/day

\= 160 images/day

RATIO: the AI could process ~36x more images than a station can capture.

\>>> THE AI IS NOT THE BOTTLENECK. THE CAMERA AND THE TECHNICIAN ARE.

CONSEQUENCES

\* Optimising inference latency below ~5 s has almost no effect on

patient throughput. Effort is better spent on REDUCING RECAPTURE RATE,

which directly consumes technician time.

\* District capacity scales by adding STATIONS, not compute.

\* The second-order bottleneck is the OPHTHALMOLOGIST, which is exactly

what Sec.37 quantifies.

This is precisely the kind of conclusion that only falls out of a

systems model, and precisely why Simulink belongs in this project.

_Figure 33.1 — Bottleneck analysis. The counter-intuitive conclusion — that inference speed barely matters — is a strong point to make to a technical panel._

**PART VII**

# **MATLAB and Simulink Engineering**

# **34\. MATLAB Architecture**

MATLAB is mandatory for this problem statement, and it happens to be genuinely well-suited to it. This section treats it as an engineering platform rather than a scripting environment — modular, tested, versioned.

## **34.1 Toolbox mapping, with an honest assessment of each**

| **Toolbox**                                 | **Used for**                                                                                                                                                                                  | **Assessment**                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Image Processing Toolbox**                | adapthisteq (CLAHE), medfilt2, imopen/imclose/imtophat, strel, imbinarize, bwareaopen, bwareafilt, regionprops, imfindcircles, fibermetric (Hessian vesselness), imresize.                    | **Heavily used and heavily suited.** fibermetric in particular does the vessel work that would otherwise require a hand-rolled Frangi filter.                                                                                                                                                                                                                                                                     |
| **Computer Vision Toolbox**                 | Feature detection utilities, labeloverlay and visualisation, evaluateSemanticSegmentation, ground-truth labelling apps.                                                                       | Used moderately. The labelling apps are valuable if any manual annotation becomes necessary.                                                                                                                                                                                                                                                                                                                      |
| **Deep Learning Toolbox**                   | imagePretrainedNetwork / pretrained backbones, dlnetwork, trainnet/trainingOptions, augmentedImageDatastore, **\`gradCAM\`**, occlusionSensitivity, imageLIME, unetLayers, exportONNXNetwork. | **Core.** The built-in gradCAM is a direct, first-class fit for a problem statement that mandates Grad-CAM — worth calling out explicitly.                                                                                                                                                                                                                                                                        |
| **Statistics and Machine Learning Toolbox** | fitcensemble / fitcsvm for the quality and lesion-candidate classifiers, perfcurve/rocmetrics, confusionmat, bootci for confidence intervals, mahal for OOD detection.                        | Used for every non-deep model and for all the statistical reporting. bootci underpins the CI reporting in §21.3.                                                                                                                                                                                                                                                                                                  |
| **Medical Imaging Toolbox**                 | Medical image datastores, groundTruthMedical, DICOM handling.                                                                                                                                 | **Honest assessment: limited applicability here.** This toolbox is oriented toward DICOM and volumetric modalities (CT/MR/ultrasound). Colour fundus photography is 2-D RGB, usually JPEG/PNG. It is used where it fits — data management conventions, any DICOM-wrapped fundus data — but the heavy lifting is done by Image Processing, Computer Vision and Deep Learning. Claiming otherwise would be padding. |
| **Simulink + SimEvents**                    | Discrete-event telemedicine and capacity model (§36–§40).                                                                                                                                     | **Core.** SimEvents is the right paradigm; see §36.1 for the fallback if it is unavailable.                                                                                                                                                                                                                                                                                                                       |
| **Stateflow**                               | Routing logic, retry state machine, escalation rules inside the Simulink model.                                                                                                               | Used for the control logic that would be awkward as block diagrams.                                                                                                                                                                                                                                                                                                                                               |
| **Parallel Computing Toolbox**              | parsim for scenario sweeps; parfor for batch evaluation.                                                                                                                                      | Optional but valuable — the §40 scenario grid is embarrassingly parallel.                                                                                                                                                                                                                                                                                                                                         |
| **MATLAB Compiler**                         | Standalone site application (§33.4).                                                                                                                                                          | The deployment enabler.                                                                                                                                                                                                                                                                                                                                                                                           |
| **MATLAB Report Generator**                 | PDF screening reports.                                                                                                                                                                        | Optional — exportgraphics is an adequate fallback.                                                                                                                                                                                                                                                                                                                                                                |

_Table 34.1 — Toolbox mapping. The Medical Imaging Toolbox row is deliberately candid; a reviewer from MathWorks will respect an accurate assessment more than an inflated one._

## **34.2 Module decomposition**

Every module is a package (+namespace) of functions and, where state is involved, a class. No script contains logic. This is what makes matlab.unittest possible, and testability is what makes validation possible.

| **Module**  | **Key interface**                               | **Responsibility**                                                                                      |
| ----------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| +preprocess | \[I, meta\] = run(raw, cfg)                     | Decode, field mask, crop, illumination, resize, branch outputs. Returns the preprocessing hash in meta. |
| +quality    | \[grade, feats, reason\] = assess(I, cfg)       | Feature extraction + gradeability classification + operator-facing reason string.                       |
| +enhance    | Ie = apply(I, grade, cfg)                       | Conditional, conservative enhancement for Grade B.                                                      |
| +anatomy    | s = localize(I, vesselMap, cfg)                 | Optic disc, fovea, laterality, geometric self-test, confidences.                                        |
| +vessels    | \[mask, score\] = segment(I, cfg)               | Multi-scale vesselness → mask + resolvability index.                                                    |
| +lesions    | L = detect(I, vesselMask, discMask, cfg)        | Bright and red lesion candidate pipelines + per-candidate probabilities.                                |
| +classify   | out = predict(net, I, cfg)                      | Ordinal forward pass, TTA, monotonic decode, calibrated probabilities.                                  |
| +calibrate  | p = apply(logits, T) / T = fit(...)             | Temperature scaling; fitted offline, applied online.                                                    |
| +explain    | E = generate(net, I, out, L, s, cfg)            | Grad-CAM, overlay composition, layer-agreement check (E6).                                              |
| +triage     | \[level, rules\] = assign(out, quality, E, cfg) | Abstention rules E1–E9, priority assignment.                                                            |
| +report     | \[pdf, json\] = build(case, out, E, L, s)       | Template-driven report; deterministic rendering.                                                        |
| +store      | saveCase(...), queueForSync(...)                | SQLite + filesystem, transactional.                                                                     |
| +eval       | m = metrics(y, yhat, scores)                    | QWK, sensitivity/specificity, calibration, FROC, bootstrap CIs.                                         |
| +viz        | figs = overlays(...)                            | All visualisation; kept separate so no analysis code depends on graphics.                               |
| +config     | cfg = load(name)                                | Versioned, hashed configuration structs. Single source of truth for every constant.                     |
| +util       | logging, hashing, timing, errors                | Cross-cutting concerns.                                                                                 |

## **34.3 Cross-cutting engineering conventions**

**Configuration.** One struct, loaded from a versioned file, hashed. Nothing is hard-coded anywhere in the pipeline. Every threshold, kernel size and clip limit lives here — which means every one of them is auditable and sweepable.

**Determinism.** Random seeds set explicitly. The same input plus the same config plus the same model must produce a byte-identical report. This is what makes the audit trail (R-13) meaningful rather than aspirational.

**Error handling.** Every stage wrapped in try/catch. Errors are recorded with a stage identifier and routed to P0 (§27.3, rule E9). A stage never returns a partial result silently.

**Logging.** Structured records, one per case per stage: stage, duration, key outputs, warnings. This is the raw material for both the performance analysis (§33) and the observability layer (§50).

**Timing.** Every stage instrumented from day one, not retrofitted. The Simulink capacity model consumes these distributions directly, so timing data is a deliverable rather than a diagnostic.

**Testing.** matlab.unittest from Phase 1. A module without tests does not get integrated (§55).

# **35\. Project Structure**

dr-screening-ai/

|

+-- matlab/

| +-- +preprocess/ decode, mask, crop, illumination, resize, branches

| +-- +quality/ features, gradeability classifier, reason strings

| +-- +enhance/ conditional enhancement

| +-- +anatomy/ optic disc, fovea, laterality, self-tests

| +-- +vessels/ multi-scale vesselness, skeleton, resolvability

| +-- +lesions/ bright + red candidate pipelines, classifiers

| +-- +classify/ ordinal network wrapper, TTA, decode

| +-- +calibrate/ temperature scaling fit + apply

| +-- +explain/ Grad-CAM, overlays, layer-agreement

| +-- +triage/ abstention rules E1-E9, priority

| +-- +report/ templates, PDF + JSON rendering

| +-- +store/ SQLite schema, transactional writes, sync queue

| +-- +eval/ QWK, Se/Sp, calibration, FROC, bootstrap CIs

| +-- +viz/ all plotting and overlay composition

| +-- +config/ versioned config structs + hashing

| +-- +util/ logging, timing, hashing, error types

|

+-- app/ App Designer UIs

| +-- TechnicianApp.mlapp capture + quality + result

| +-- ReviewerApp.mlapp adjudication interface

| +-- DemoApp.mlapp SIH demonstration front-end

|

+-- datasets/ READ-ONLY. never written by code.

| +-- aptos/ idrid/ drive/ messidor2/

| +-- manifests/ versioned CSV/Parquet manifests (Sec.8.1)

|

+-- models/ immutable artefacts

| +-- v0.1-resnet18-384/ weights + preprocessing hash + T + tau\*

| +-- v0.2-effb0-512/ + training config + dataset version + commit

| +-- registry.json index, provenance, evaluation-gate results

|

+-- training/ experiment scripts, one per experiment, versioned

+-- experiments/ results, logs, figures -- NEVER edited by hand

|

+-- simulink/

| +-- dr_screening_service.slx top-level SimEvents model

| +-- subsystems/ referenced subsystem models

| +-- +scenarios/ scenario parameter definitions A-G

| +-- +analysis/ post-processing, plots, tables

| +-- data/ measured latency distributions

| <-- produced by the MATLAB pipeline

|

+-- tests/

| +-- unit/ matlab.unittest per module

| +-- integration/ multi-module

| +-- e2e/ image in -> report out

| +-- regression/ golden outputs, pixel-diff tolerances

| +-- performance/ latency + throughput assertions

| +-- fixtures/ small committed test images + expected outputs

|

+-- configs/ default.json, mvp.json, demo.json, edge_cpu.json

+-- results/ generated tables + figures for the report

+-- scripts/ run_training.m, run_eval.m, run_sim.m, package_app.m

+-- docs/ ADRs, this blueprint, API spec, runbook

+-- README.md

_Figure 35.1 — Repository structure._

## **35.1 Structural rules**

- **\`datasets/\` is read-only.** No code writes there. Derived data goes to a separate cache directory. This prevents the single most common data-integrity accident.
- **\`models/\` entries are immutable.** A change produces a new directory, never an edit. The registry is append-only.
- **\`experiments/\` is machine-written only.** Hand-editing a results file is how a project loses the ability to trust its own numbers.
- **\`simulink/data/\` is generated by the MATLAB pipeline.** The simulation consumes _measured_ latency and quality distributions, not invented ones. This directory is the concrete link between Part IV and Part VII, and it is what makes the Simulink work non-decorative.
- **Every config change bumps a version.** Configs are hashed into model artefacts.
- **\`tests/fixtures/\` holds small committed images.** Tests must run without the full datasets present, or CI is impossible.

# **36\. Simulink System Model**

Simulink here answers a question no amount of model accuracy can: given measured component behaviour, how many cameras, technicians, reviewers and megabits does a district actually need, and where does the service jam first? This is a discrete-event queueing problem with a rework loop and a scarce server.

## **36.1 Why SimEvents, and what to do without it**

The system being modelled is a network of **queues and servers** with **entities** (patient cases) that carry attributes and take probabilistic routes. That is precisely the SimEvents domain. Continuous-time Simulink would model flows and rates but cannot represent an individual case waiting in a queue, and queue-length distributions — not mean rates — are what determine whether a service is workable.

**Fallback if SimEvents is not licensed**

The model can be built in base Simulink using Stateflow for routing and MATLAB Function blocks maintaining explicit queue arrays, with a fixed small time step. This is more work and less elegant, but it is entirely feasible and produces the same outputs. **Verify SimEvents availability early in Phase 0** — it changes the Phase 7 estimate materially. Either way, the model is genuinely a Simulink deliverable.

## **36.2 Entity definition**

ENTITY: PatientCase

arrival_time simulation clock at generation

site_id which screening node

n_images typically 2 (one per eye)

true_severity sampled from the assumed prevalence distribution

capture_quality sampled from the MEASURED quality distribution

capture_attempts counter, incremented on recapture

ai_grade assigned by the AI-processing server

ai_confidence assigned by the AI-processing server

triage_level P0 | P1 | P2 | P3

upload_bytes depends on tier (Sec.31.3)

t_quality, t_ai, t_upload, t_queue, t_review stage timestamps

ATTRIBUTE SOURCES -- this is the important part

capture_quality distribution : MEASURED from running the quality module

over the APTOS images (Sec.9)

AI service time distribution : MEASURED from the latency instrumentation

(Sec.33.2)

referral rate given severity : MEASURED sensitivity/specificity (Sec.21)

prevalence distribution : ASSUMPTION, swept 5-25% (Sec.40)

arrival process : ASSUMPTION, camp vs routine profiles

review service time : ASSUMPTION/TARGET 30 s, from Sec.25.4

\>>> THREE OF SIX INPUTS ARE MEASURED FROM OUR OWN PIPELINE.

\>>> That is what stops this being a toy simulation with invented numbers,

\>>> and it is the single strongest argument that Simulink is integrated

\>>> rather than bolted on.

_Figure 36.1 — Entity and attribute sources. The provenance of each parameter is stated because a simulation is only as credible as its inputs._

## **36.3 Subsystem architecture**

| **Subsystem**              | **Inputs**              | **Outputs**                        | **Parameters**                                                      | **State**                    | **Metrics logged**                                               |
| -------------------------- | ----------------------- | ---------------------------------- | ------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------- |
| **Patient arrival**        | Arrival profile         | PatientCase entities               | Arrival rate λ(t), camp/routine schedule, no-show rate              | Generation clock             | Arrivals/day, inter-arrival distribution                         |
| **Registration + capture** | Entities                | Entities with images               | n_stations, service time distribution, images/patient               | Station busy/idle            | Station utilisation, capture queue length                        |
| **Quality gate**           | Entities                | A/B → forward; C → recapture or P0 | Quality distribution (MEASURED), retry budget n_max                 | Attempt counter per entity   | Grade distribution, recapture rate, ungradeable-after-retry rate |
| **AI processing**          | Entities                | Graded entities                    | n_compute_nodes, service time distribution (MEASURED), failure rate | Node busy/idle               | AI utilisation, AI queue length, latency percentiles             |
| **Triage / routing**       | Graded entities         | P0/P1/P2/P3 routes                 | Se, Sp (MEASURED), abstention rate, audit sample rate               | —                            | Referral rate, abstention rate, false-negative count             |
| **Network / upload**       | Entities needing review | Uploaded entities                  | Bandwidth (Mbps), outage on/off process, tier payload sizes         | Link up/down, backlog bytes  | Upload latency, backlog, outage duration                         |
| **Telemedicine queue**     | Uploaded entities       | Ordered entities                   | Discipline: priority P1 > P0 > P2 > P3-audit                        | Queue contents               | Queue length over time, waiting-time distribution by priority    |
| **Ophthalmologist review** | Queued entities         | Adjudicated entities               | n_reviewers, shift pattern, service time distribution               | Reviewer busy/idle/off-shift | Reviewer utilisation, throughput, SLA breach rate                |
| **Outcome / sink**         | Adjudicated entities    | —                                  | —                                                                   | —                            | End-to-end time distribution, % within SLA, outcome mix          |

_Table 36.1 — Simulink subsystem specification. Each row is directly implementable as a SimEvents subsystem._

## **36.4 The rework loop, and why it deserves attention**

+-------------------------------------------+

| |

v |

\[capture\]---->\[quality gate\]---- Grade C ----> attempts < n_max ?

^ | | |

| A / B yes no

| | | |

| v +---+

| \[AI processing\] |

| v

+--------- returns to CAPTURE, consuming P0

a station slot AGAIN

WHY THIS IS THE INTERESTING PART OF THE MODEL

The recapture loop feeds back into the CAPTURE server, which is the

system's primary bottleneck (Sec.33.5). Effective capture demand is

therefore NOT the arrival rate -- it is:

effective_demand = arrivals x (1 + p_C + p_C^2) for n_max = 2

With p_C = 0.10 : effective demand = 1.11 x arrivals (manageable)

With p_C = 0.25 : effective demand = 1.31 x arrivals (noticeable)

With p_C = 0.40 : effective demand = 1.56 x arrivals (severe)

Because the capture server is near saturation in a busy camp, a

MODEST rise in rejection rate produces a LARGE, NON-LINEAR rise in

queue time -- the classic behaviour of a queue approaching utilisation 1.

\>>> THIS IS THE CENTRAL SYSTEMS INSIGHT OF THE PROJECT:

\>>> IMAGE QUALITY IS NOT AN IMAGE-PROCESSING PROBLEM. IT IS A

\>>> THROUGHPUT PROBLEM, AND IT IS NON-LINEAR.

\>>> Improving the quality-feedback message to technicians may do more

\>>> for district capacity than improving model accuracy.

Only a systems model surfaces this. It is Scenario C in Sec.40.

_Figure 36.2 — The recapture feedback loop. This analysis is the clearest demonstration that the Simulink component is doing real engineering work._

# **37\. District-Level Capacity Simulation**

## **37.1 Baseline scenario definition**

| **Parameter**             | **Baseline value**                 | **Source**                           | **Swept range** |
| ------------------------- | ---------------------------------- | ------------------------------------ | --------------- |
| Annual patient target     | 100,000                            | Problem statement                    | 50k–200k        |
| Working days/year         | 250                                | ASSUMPTION                           | 220–280         |
| Patients/day (district)   | 400                                | Derived                              | 200–800         |
| Screening sites           | 10                                 | ASSUMPTION                           | 5–25            |
| Patients/site/day         | 40                                 | Derived                              | —               |
| Images/patient            | 2                                  | One macula-centred field per eye     | 2–4             |
| Capture service time      | 6 min/patient (μ), lognormal       | ASSUMPTION (A4)                      | 4–10 min        |
| Quality Grade C rate      | 10%                                | **MEASURED** from the quality module | 5–40%           |
| Retry budget n_max        | 2                                  | Design (§9.5)                        | 1–3             |
| AI service time           | From measured latency distribution | **MEASURED** (§33.2)                 | ×0.5 – ×4       |
| Compute nodes/site        | 1                                  | Design                               | 1–2             |
| Referable prevalence      | 12%                                | ASSUMPTION (A3)                      | 5–25%           |
| Sensitivity / specificity | From measured operating point      | **MEASURED** (§21)                   | frontier sweep  |
| Abstention rate           | 7%                                 | Design target (§22.4)                | 3–15%           |
| P3 audit sample rate      | 5%                                 | Design (§28.3)                       | 1–20%           |
| Uplink bandwidth          | 1 Mbps mean, on/off outages        | ASSUMPTION (A7)                      | 0.25–10 Mbps    |
| Review service time       | 30 s (μ), lognormal σ              | TARGET (A5)                          | 20–120 s        |
| Reviewers                 | 1                                  | To be determined by the simulation   | 0.25–4 FTE      |
| Reviewer shift            | 4 h/day dedicated                  | ASSUMPTION                           | 2–8 h           |

_Table 37.1 — Baseline parameters. Four of the nineteen are MEASURED from our own pipeline; the rest are declared assumptions with swept ranges._

## **37.2 Analytic pre-check**

Before running the simulation, the arithmetic is done by hand. If the simulation disagrees with a first-order hand calculation, one of the two is wrong — and finding out which is a far better use of an afternoon than debugging a model that was never sanity-checked.

CAPTURE CAPACITY

6 min/patient, 8 h/day, 1 station/site

\= 80 patients/station/day (at 100% utilisation -- unrealistic)

\= ~56 patients/station/day at 70% utilisation (realistic)

with recapture at p_C = 0.10: effective demand = 1.11x

\-> ~50 patients/station/day achievable

for 400 patients/day -> 8 stations minimum, 10 with headroom. \[OK\]

AI CAPACITY

~12 images/min sustained -> 5,760 images/day/node

demand: 800 images/day + recaptures ~= 890 images/day

\-> ONE node covers the ENTIRE DISTRICT, ~6.5x over.

\-> AI compute is not a constraint. Confirms Sec.33.5.

REVIEWER LOAD (safety-first policy: review everything)

400 patients x 30 s = 12,000 s = 3.33 h/day

\-> ~0.42 FTE at an 8 h day, or ~0.83 of a 4 h dedicated session.

\-> ONE reviewer covers the district with headroom. \[KEY RESULT\]

REVIEWER LOAD (steady-state policy: positives + uncertain + audit)

referred : 400 x 0.225 = 90 (Se .90 / Sp .85 at 12% prevalence)

abstained : 400 x 0.07 = 28

P3 audit 5% : 400 x 0.05 = 20

ungradeable : 400 x 0.03 = 12 (after retries)

total ~ 150 cases x 40 s (avg, mixed difficulty) = 6,000 s

\= 1.67 h/day -> ~0.21 FTE.

UPLOAD LOAD (tiered, Sec.31.3)

~140 MB/day/district -> 1.2 h at 0.256 Mbps, 9 min at 2 Mbps. \[OK\]

HEADLINE, TO BE CONFIRMED BY SIMULATION

10 screening stations + 1 compute node per site + 1 part-time

ophthalmologist can serve a 100,000-patient district.

WITHOUT AI, the same district needs ~2.5 FTE ophthalmologists for

grading alone.

All figures ASSUMPTION-conditioned; the SIMULATION's job is to show

where this breaks.

_Figure 37.1 — Analytic pre-check. The simulation exists to find the non-linear failures this linear arithmetic cannot see._

## **37.3 What the simulation adds beyond the arithmetic**

- **Queue dynamics.** Mean utilisation of 70% does not mean nobody waits. The waiting-time _distribution_ is what determines whether patients leave, and only simulation gives it.
- **Burstiness.** Camp days are not Poisson — 200 patients may arrive in a morning. Peak queue length, not mean load, sizes the service.
- **Non-linear coupling.** The recapture loop (§36.4) couples image quality to capture capacity multiplicatively. A 10%→25% quality regression does not cost 15% of capacity; near saturation it can cost far more.
- **Outage interaction.** A 6-hour outage during a camp creates a backlog that then contends with the next day's uploads. Recovery time is not obvious analytically.
- **Reviewer shift patterns.** A reviewer available 4 h/day is not the same as 0.5 FTE spread evenly; P1 cases arriving after the session wait until the next one, and the SLA breach rate depends on shift alignment.
- **Sensitivity ranking.** Which parameter, moved by 10%, moves the outcome most? That ranking is the practical output for a programme manager, and it is what §38 delivers.

# **38\. Resource Optimisation**

## **38.1 The questions the model answers**

| **Question**                        | **Method**                                                                                                          | **Output form**                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| How many screening stations?        | Sweep n_stations; find the smallest value keeping P95 patient wait below target and station utilisation below ~0.8. | A number, with a utilisation curve showing the knee.                                                      |
| How many cameras?                   | Cameras ≈ stations, plus a spares factor for failure and maintenance.                                               | A number with a spares recommendation.                                                                    |
| How much local compute?             | Sweep AI service time ×0.5 to ×4 and observe when AI queueing becomes non-negligible.                               | A statement of the latency at which compute _starts_ to matter — expected to be far above current values. |
| How many ophthalmologists?          | Sweep n_reviewers × review-time × policy; find the minimum meeting the SLA.                                         | FTE requirement, per review policy, with a shift-pattern recommendation.                                  |
| What if image quality deteriorates? | Sweep p_C from 5% to 40%.                                                                                           | The non-linear capacity curve of §36.4 — the headline systems result.                                     |
| What if connectivity worsens?       | Sweep bandwidth and outage duration.                                                                                | Backlog and P1 SLA breach curves; the bandwidth floor below which the tiered scheme fails.                |
| What if referral rate rises?        | Sweep prevalence and specificity.                                                                                   | Reviewer FTE as a function of specificity — this is what converts a model metric into a staffing cost.    |
| What if AI inference slows?         | Sweep AI service time.                                                                                              | Confirms or refutes the "AI is not the bottleneck" claim under stress.                                    |
| Where does it bottleneck?           | Utilisation of every server across the full scenario grid.                                                          | A ranked bottleneck table per scenario.                                                                   |

## **38.2 The specificity-to-staffing curve**

**The most useful single output of the entire simulation**

Sweeping specificity while holding sensitivity at 0.90 produces a curve of **reviewer FTE versus model specificity**. That curve converts an abstract ML metric into a line item a district health officer can act on.

It also gives the project a defensible answer to the hardest possible question: _"what if you miss the 85% specificity target?"_ The answer becomes **"specificity of 0.78 rather than 0.85 costs approximately X additional reviewer-hours per day, which this district can/cannot absorb"** — a quantified consequence rather than an apology.

It further tells the ML team **when to stop optimising**: once additional specificity no longer changes the reviewer headcount, further model work has no operational value and effort should move elsewhere. Very few projects can say where that point is.

ILLUSTRATIVE SHAPE (to be produced with MEASURED inputs, Phase 9)

reviewer

FTE

1.0 |\*

| \*

0.8 | \*

| \*\*

0.6 | \*\*\*

| \*\*\*\*

0.4 | \*\*\*\*\*\*\*

| \*\*\*\*\*\*\*\*\*\*

0.2 | \*\*\*\*\*\*\*\*\*\*\*\*\*\*\*

+---------------------------------------------------

0.60 0.70 0.75 0.80 0.85 0.90 0.95

specificity (at Se = 0.90)

READING: below ~0.75 specificity, reviewer load rises sharply and the

programme becomes staffing-constrained. Above ~0.88 the curve flattens

and further specificity gains buy little operationally.

The engineering target should sit at the KNEE, not at the maximum.

_Figure 38.1 — Illustrative specificity-to-staffing relationship. Shape shown for explanation; actual curve produced from measured performance._

## **38.3 Optimisation output format**

Each scenario produces a one-page recommendation: required stations, cameras, compute nodes and reviewer FTE; the identified bottleneck; P95 patient waiting time; P1 SLA compliance; and the two parameters to which the result is most sensitive. That last item matters most — it tells the programme manager what to monitor.

# **39\. Telemedicine Workflow**

## **39.1 Three nodes**

| **Node**                      | **Function**                                                                                             | **Data held**                                             | **Connectivity requirement**                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| **Rural screening node**      | Registration, capture, quality, full local AI analysis, report, local queue.                             | Full case record for its own patients; encrypted at rest. | **None required for operation.** Sync opportunistically. |
| **District node**             | Case aggregation, priority queue, reviewer assignment, dashboards, model distribution, drift monitoring. | All cases for the district.                               | Always-on; the reviewer connects here.                   |
| **Ophthalmologist interface** | Prioritised worklist; adjudication; override; notes; batch actions.                                      | Session-scoped view; no local storage of images.          | Broadband, asynchronous use.                             |

## **39.2 Reviewer worklist design**

- **Priority ordering:** P1 (urgent) → P0 (cannot assess / abstained) → P2 (routine referral) → P3 audit sample. P0 sits second deliberately: an ungradeable image on a diabetic patient may be hiding advanced disease, and it is also the case where the AI has explicitly declined to help.
- **Ageing:** waiting time is added to priority so nothing starves. A P2 case approaching its SLA is promoted.
- **Batching by similarity:** grouping cases with similar findings reduces context-switching cost. A reviewer working through twelve suspected-moderate-NPDR cases in a row is faster than one alternating between grades.
- **Keyboard-first:** agree / disagree / regrade / next must be single keystrokes. At 30 seconds per case, mouse travel is a measurable fraction of the budget.
- **Fellow-eye linkage:** both eyes of a patient are presented together. DR is bilateral, and the fellow eye is genuinely diagnostic context.
- **Explicit "I need the full-resolution image" action:** triggers an on-demand tier-3 fetch (§31.3) rather than pre-shipping every original.

## **39.3 Feedback capture**

Every adjudication writes a structured record: reviewer ID, timestamp, seconds spent, AI grade, reviewer grade, agreement flag, override reason code, and free-text notes. This record is the input to error analysis (§44), drift monitoring (§58), and the reviewer-time metric that validates the whole value proposition (§25.4). It is also the dataset that would eventually support a blinded re-grading study for retraining labels (§27.4) — but only under the blinding protocol, never directly.

# **40\. Simulation Scenarios**

## **40.1 The seven scenarios**

| **Scenario**             | **Configuration**                                                  | **Question it answers**                                         | **Expected finding**                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Ideal**            | Baseline: 2 Mbps, p_C = 5%, 12% prevalence, 1 reviewer.            | Does the design work at all under favourable conditions?        | Comfortable. Establishes the reference point.                                                                                         |
| **B — Low bandwidth**    | 0.25 Mbps with 6 h outages twice weekly.                           | Does the tiered upload scheme hold? Do P1 cases still meet SLA? | Tier-1/2 sustainable; tier-3 on-demand becomes slow. Validates the out-of-band urgent path (§32.1).                                   |
| **C — High rejection**   | p_C swept 5% → 40%.                                                | How does capture capacity respond to quality degradation?       | **Non-linear collapse** as the capture server saturates. The headline systems result (§36.4).                                         |
| **D — High prevalence**  | Referable prevalence 25%.                                          | What happens to reviewer load in a high-burden district?        | Referral rate rises; reviewer FTE requirement roughly doubles. Tests whether one reviewer still suffices.                             |
| **E — Reviewer-limited** | 0.25 FTE reviewer, or a reviewer absent for a week.                | Where does the backlog go, and can it recover?                  | Queue grows without bound below a critical FTE. Identifies the minimum viable staffing and the recovery time after an absence.        |
| **F — AI slowdown**      | AI service time ×4.                                                | Does inference latency ever matter?                             | Expected: still not the bottleneck. **Reporting a negative result here is valuable** — it justifies not optimising inference further. |
| **G — Full scale**       | 100,000+/year, all parameters at baseline, 250-day simulated year. | The problem statement's stated scale.                           | The headline capacity recommendation with annual aggregates.                                                                          |

_Table 40.1 — Scenario matrix. Scenario F is included specifically because a negative result is a result._

## **40.2 Comparison outputs**

| **Output**             | **Form**                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------- |
| Throughput             | Patients and images completed per day; annual total.                                |
| End-to-end latency     | Capture → final decision. Distribution, P50/P95, by triage level.                   |
| Queue length over time | Time series per queue, showing peaks and recovery.                                  |
| Utilisation            | Per server (capture, AI, network, reviewer). The bottleneck is the one nearest 1.0. |
| Reviewer workload      | Cases/day, hours/day, SLA compliance by priority.                                   |
| System capacity        | Maximum sustainable patients/day before P95 wait exceeds target.                    |
| Sensitivity ranking    | Tornado chart: which parameter moves the outcome most.                              |

## **40.3 Execution**

Scenarios are defined as parameter structs and executed via Simulink.SimulationInput arrays with parsim for parallel sweeps. Each run is seeded and repeated (≥20 replications) so that reported figures carry confidence intervals rather than being single-run artefacts — a discrete-event simulation reported without replication variance is as untrustworthy as a single-seed model comparison. Results are written to experiments/ and rendered into tables and figures by +analysis, with no manual transcription anywhere in the chain.

**PART VIII**

# **Validation, Benchmarking and Error Analysis**

# **41\. External Validation**

Internal test performance measures how well a model fits a distribution it was built on. External validation measures whether it will work anywhere else. For a system intended for deployment across districts with different cameras and populations, only the second number means anything.

## **41.1 Protocol**

PHASE 9, EXECUTED ONCE, IN THIS ORDER

1\. FREEZE everything: weights, preprocessing config + hash, temperature T,

threshold tau\*, decode rule. Commit and tag. Nothing may change after

this point.

2\. INTERNAL TEST -- open the held-out APTOS split. Report the full metric

suite. This is the internal headline.

3\. EXTERNAL TEST -- open Messidor-2 for the first time.

3a. verify the label file's provenance and the grading scheme;

document the mapping to ICDR 0-4 explicitly;

3b. run the FROZEN pipeline. No re-tuning. No re-calibration.

No threshold adjustment. No preprocessing tweak.

3c. report the same metric suite at the frozen tau\*.

4\. DIAGNOSTIC (reported separately and clearly labelled as diagnostic,

not as a result):

4a. Messidor-2 performance at a Messidor-2-OPTIMAL threshold;

4b. Messidor-2 performance after re-fitting the temperature on a

held-out Messidor-2 subset.

These two quantify how much of any degradation is CALIBRATION drift

(fixable at deployment by per-site calibration) versus DISCRIMINATION

drift (a real model limitation).

5\. REPORT THE GAP AS A HEADLINE NUMBER, NOT AN APPENDIX FOOTNOTE.

WHY STEP 4 IS THE INTERESTING ONE

If sensitivity collapses at the frozen threshold but recovers fully at

a re-optimised one, the model still DISCRIMINATES well and the problem

is that probabilities shifted. That is an operationally solvable problem:

calibrate per site on a small local sample. If it does NOT recover, the

model genuinely fails to generalise, and that is a different and far

more serious finding. Distinguishing these two is worth more than the

headline number itself.

_Figure 41.1 — External validation protocol. Step 4 turns a disappointing result into an actionable diagnosis._

## **41.2 What is measured, and against what**

| **Dataset**           | **Role**              | **What is measured**                                                                                            | **Expectation**                                                                                                                                         |
| --------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| APTOS held-out test   | Internal              | Full metric suite (§20).                                                                                        | The optimistic bound.                                                                                                                                   |
| Messidor-2            | External, primary     | Full suite at frozen τ\*, plus the step-4 diagnostics.                                                          | **Degradation is expected and normal.** A system reporting _no_ degradation across a genuine domain shift is more likely to have a leak than a miracle. |
| IDRiD grading subset  | External, secondary   | Grading metrics — noting the small size and the fact that IDRiD lesion masks were used elsewhere in the system. | Small-sample; reported with wide CIs and appropriate caveats.                                                                                           |
| DRIVE test            | External, vessel task | Dice, IoU, sensitivity at matched specificity — against the second-observer ceiling.                            | Should approach the inter-observer figure; exceeding it would be suspicious.                                                                            |
| APTOS unlabelled test | **Label-free only**   | Quality-grade distribution, prediction distribution, abstention rate, throughput.                               | Used for drift-detection rehearsal and demo material. **No supervised metric.**                                                                         |

## **41.3 Domain-shift analysis**

Where degradation occurs, we localise it rather than merely reporting it:

- **Quality distribution shift.** Compare the quality feature distributions of Messidor-2 against APTOS. If Messidor-2 images are systematically cleaner, some apparent degradation may be a _quality-mix_ artefact and should be reported stratified by quality grade.
- **Prediction distribution shift.** Compare the distribution of P(referable). A shifted mean with preserved shape points at calibration; a compressed or bimodal distribution points at something worse.
- **Feature-space distance.** Mahalanobis distance of Messidor-2 encoder embeddings from the training distribution, per image. Cases at large distance are flagged by escalation rule E5 in deployment; here they quantify how far the shift actually is.
- **Camera and field-angle differences.** Different field angle changes pixels-per-degree, which changes apparent lesion size in model-input pixels. This is a _correctable_ shift — resampling to a common pixels-per-degree is a legitimate deployment-time normalisation, and whether it helps is measurable.
- **Label-scheme differences.** The most likely single cause of an unexpectedly poor external number. Investigated _before_ concluding the model has failed.

**The one thing not to do**

Do not tune anything to improve the Messidor-2 number and then report it as external validation. If tuning happens, Messidor-2 becomes a second validation set and the project no longer has any external validation at all. If tuning is genuinely necessary, say so, report both numbers, and label the tuned one as what it is.

# **42\. Benchmarking and the Integrated-Pipeline Ablation**

The problem statement asks whether the integrated pipeline beats a single-technique approach. That is an empirical question with a real chance of a negative answer, and answering it honestly is worth more than assuming it.

## **42.1 The five arms**

| **Arm**                           | **Components**                                                                                                                       | **Tests**                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1 — Classical only**           | Preprocessing + lesion detection + a rule-based grade from lesion counts (approximating the ICDR criteria).                          | The pre-deep-learning baseline. Establishes what hand-crafted features achieve, and is genuinely instructive — if B1 is close to B2, the CNN is not adding much. |
| **B2 — Bare CNN**                 | Minimal preprocessing (resize + normalise) + ordinal CNN. No quality gate, no anatomy, no lesions.                                   | The standard published approach. **This is the arm most competing projects actually build.**                                                                     |
| **B3 — CNN + preprocessing**      | B2 + full preprocessing (mask, crop, illumination normalisation).                                                                    | Does careful preprocessing help, or does the CNN learn it anyway?                                                                                                |
| **B4 — B3 + explainability**      | B3 + Grad-CAM. Same predictions.                                                                                                     | Isolates explanation cost and reviewer benefit. Predictive metrics are unchanged by construction; the **reviewer-time** metric is what moves.                    |
| **B5 — Full integrated pipeline** | Quality gate + routing + enhancement + anatomy + lesion evidence + ordinal CNN + calibration + abstention + three-layer explanation. | The proposed system.                                                                                                                                             |

_Table 42.1 — Ablation arms. Each arm differs from its predecessor by one component group, so attribution is possible._

## **42.2 Reporting template**

| **Arm**            | **QWK** | **Se (refer)** | **Sp (refer)** | **ECE** | **Coverage** | **Latency P95** | **Reviewer s/case** |
| ------------------ | ------- | -------------- | -------------- | ------- | ------------ | --------------- | ------------------- |
| B1 classical       | \_TBD_  | \_TBD_         | \_TBD_         | n/a     | 100%         | \_TBD_          | \_TBD_              |
| B2 bare CNN        | \_TBD_  | \_TBD_         | \_TBD_         | \_TBD_  | 100%         | \_TBD_          | \_TBD_              |
| B3 + preprocessing | \_TBD_  | \_TBD_         | \_TBD_         | \_TBD_  | 100%         | \_TBD_          | \_TBD_              |
| B4 + Grad-CAM      | \_TBD_  | \_TBD_         | \_TBD_         | \_TBD_  | 100%         | \_TBD_          | \_TBD_              |
| B5 full pipeline   | \_TBD_  | \_TBD_         | \_TBD_         | \_TBD_  | **< 100%**   | \_TBD_          | \_TBD_              |

_Table 42.2 — Ablation results template, to be completed in Phase 9. All comparisons over ≥3 seeds with bootstrap CIs._

**Two things this table is designed to force into the open**

**Coverage.** B5 refuses ungradeable images, so its metrics are computed on a subset. A comparison that ignores this is meaningless — B5 could "win" purely by declining the hard cases. Every metric is therefore reported as a **(metric, coverage)** pair, and B1–B4 are additionally re-scored on B5's covered subset so that a like-for-like comparison exists.

**Reviewer seconds per case.** This is the column where B4 and B5 are expected to earn their complexity — and it is a column almost no comparable project reports at all. If B5 matches B2 on QWK but halves reviewer time, B5 is the better _system_ even though it is not the better _model_. That distinction is the entire argument of this document.

## **42.3 Comparison against published work**

Our numbers are placed alongside published ranges for DR grading on the same public datasets — with an explicit statement of why the comparison is imperfect:

- Different splits. Published APTOS results typically use competition-specific splits or private leaderboard scores that cannot be reproduced.
- Different label sources for Messidor-2. Several distinct annotation efforts exist; results are not comparable across them.
- Different task definitions. Some published work reports five-class QWK, some referable-DR AUC, some a "any DR" binary — three different problems.
- Ensembles and heavy test-time augmentation are common in competition results and inflate figures relative to a deployable single model.
- **Our position:** published numbers calibrate expectations about what is achievable. They do not certify our system, and we do not claim to beat a leaderboard we did not compete on. Stating this is more credible than an unqualified comparison table.

# **43\. Clinical Validation Strategy**

## **43.1 Three distinct kinds of validation — kept separate**

| **Type**                                | **Question**                                                              | **Method**                                                                          | **What it does NOT establish**                                         |
| --------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Technical validation**                | Does the model perform on data?                                           | Metric suite on internal test + Messidor-2 (§20, §41).                              | That it helps a clinician. That it works in a clinic. That it is safe. |
| **Clinical utility evaluation**         | Do the outputs help a reviewer decide faster and at least as accurately?  | Reviewer study (§25.4), arms 1/2/3, with an automation-bias check.                  | Patient outcomes. Effectiveness at scale.                              |
| **Operational validation**              | Can the system process the intended workload in the intended environment? | Latency and throughput benchmarks (§33), plus Simulink capacity analysis (§37–§40). | Anything clinical.                                                     |
| _(Out of scope)_ Clinical effectiveness | Does using this system improve patient outcomes?                          | Prospective clinical study with follow-up.                                          | —                                                                      |

_Table 43.1 — Validation taxonomy. Conflating rows 1 and 2 is the most common overclaim in AI healthcare projects; conflating either with row 4 is the most serious._

## **43.2 What we will and will not claim**

| **Claim**                                                                                             | **Supportable?**                                                                 | **Basis**                                                                      |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| "Achieves QWK of X on a held-out APTOS split."                                                        | **Yes**                                                                          | Technical validation, stated with the split protocol.                          |
| "Achieves sensitivity Y at specificity Z for referable DR at a pre-specified threshold, with 95% CI." | **Yes**                                                                          | Technical validation with the operating point and CI stated.                   |
| "Performance degrades by D on an external dataset."                                                   | **Yes, and we report it prominently**                                            | External validation.                                                           |
| "Explanations localise to annotated lesions at rate R, versus C for a randomised-weight control."     | **Yes**                                                                          | Explanation validation (§25.2).                                                |
| "Reduces median reviewer time from A to B seconds."                                                   | **Yes, if the study is run**                                                     | Reviewer study (§25.4).                                                        |
| "Can process N patients/day on specified hardware."                                                   | **Yes**                                                                          | Operational benchmarks.                                                        |
| "A district of 100,000 patients can be served by K reviewers under stated assumptions."               | **Yes, as a simulation result with assumptions declared**                        | Simulink (§37).                                                                |
| "Is clinically validated."                                                                            | **No**                                                                           | Requires prospective study and regulatory process. Not attempted, not claimed. |
| "Is safe for autonomous use."                                                                         | **No**                                                                           | Explicitly out of scope; the architecture forbids it (§28).                    |
| "Detects microaneurysms."                                                                             | **Only as: detects red-lesion candidates with FROC-characterised performance."** | §13.3, §14.                                                                    |
| "Outperforms ophthalmologists."                                                                       | **No**                                                                           | Not measured, not meaningful for a screening triage aid, and not the goal.     |

_Table 43.2 — Claim register. The rows marked "No" are the ones that would end a technical panel's goodwill._

## **43.3 Statistical rigour**

- **Confidence intervals on everything.** Bootstrap (≥1,000 replicates) for sensitivity, specificity, QWK, PPV, NPV. A point estimate on a test set of a few hundred cases has a wide interval, and hiding that is a form of overclaiming.
- **Multiple seeds.** Every model comparison run with ≥3 seeds; mean ± std reported. At this data scale, seed variance frequently exceeds the difference between two architectures.
- **Pre-specification.** The threshold rule, the primary metric and the ablation arms are written down _before_ the test set is opened. This document is that pre-specification.
- **No selective reporting.** All seven Simulink scenarios and all five ablation arms are reported, including unflattering ones. Selective reporting is the difference between a result and a demonstration.
- **Sample-size honesty.** With a few hundred referable cases in a test split, a sensitivity difference below a few percentage points is not detectable. We will say so rather than reporting a spurious improvement.

# **44\. Error Analysis**

Aggregate metrics tell you how much you are wrong. Error analysis tells you why, which is the only input to fixing it.

## **44.1 Stratification axes**

| **Axis**                | **Strata**                      | **What a difference here would mean**                                                                                                               |
| ----------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| True severity           | 0 / 1 / 2 / 3 / 4               | Poor grade-2 recall directly threatens the referral objective; poor grade-3 recall is likely a data-scarcity problem.                               |
| Quality grade           | A / B                           | A large A→B gap justifies quality-aware routing (§23) and quantifies its benefit.                                                                   |
| Confidence band         | Deciles of P(referable)         | Verifies that the abstention band is placed where errors actually concentrate — if errors are uniform across confidence, calibration has failed.    |
| Lesion burden           | Detected red-lesion count bands | Failures at low lesion burden indicate a resolution or sensitivity limit; failures at high burden indicate something stranger and more interesting. |
| Illumination / exposure | Under / normal / over           | Points at a preprocessing gap.                                                                                                                      |
| Blur level              | Sharp / mild / moderate         | Validates the quality threshold placement.                                                                                                          |
| Field coverage          | Full / partial                  | Peripheral loss may hide peripheral lesions — a field-of-view limitation, not a model limitation.                                                   |
| Laterality              | OD / OS                         | Any difference indicates a training or augmentation asymmetry and is a bug, not a finding.                                                          |
| Dataset / camera        | APTOS / IDRiD / Messidor-2      | Domain-shift attribution.                                                                                                                           |
| CAM–lesion agreement    | Agree / disagree                | Disagreement should predict error. If it does not, escalation rule E6 is not earning its place.                                                     |

## **44.2 Failure taxonomy**

| **Pattern**                                             | **Likely root cause**                                                                                        | **Impact**                             | **Candidate fix**                                                                                   | **Validating experiment**                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Grade 2 predicted as grade 1 (**the critical failure**) | Insufficient resolution to see the lesions distinguishing them; or genuine label ambiguity at that boundary. | **Missed referral.**                   | Raise input resolution; upweight the 1\|2 boundary in the loss; lower τ\*.                          | Resolution ablation (§16.4); threshold sweep (§21.3); re-grade a sample of these cases blind. |
| Grade 4 predicted as grade 2                            | Neovascularisation not detected — expected, since it is not explicitly modelled (§13.1).                     | Delayed urgent care.                   | Add a vessel-abnormality feature; strengthen the E7 rule with a large-haemorrhage trigger.          | Grade-4 recall tracked separately; NVD-suspicious case review.                                |
| Confident error on Grade B images                       | Enhancement introduced artefacts, or the model over-relies on a texture cue.                                 | False confidence.                      | Widen the uncertainty band for Grade B; re-check enhancement against the lesion-survival criterion. | Stratified error rate by quality; §10.4 re-run.                                               |
| Exudate false positives near the optic disc             | Disc mask too tight or disc localisation failed.                                                             | Over-referral; misleading explanation. | Dilate the disc mask; add a localisation-confidence gate.                                           | Precision measured against IDRiD masks with and without dilation.                             |
| Red-lesion false positives along vessels                | Vessel mask under-segmented at fine scale.                                                                   | Over-referral; noisy explanation.      | Improve fine-scale vesselness; increase dilation before subtraction.                                | FROC before/after; DRIVE fine-vessel recall.                                                  |
| CAM highlights the image border or a black region       | **A bug**, not a finding — field mask not applied to the CAM.                                                | Explanation is nonsense.               | Mask the CAM to the field of view.                                                                  | Unit test asserting zero CAM energy outside the mask.                                         |
| Systematic error on one device                          | Device-specific colour or optics; domain shift.                                                              | Site-level degradation.                | Per-device calibration; add device to the drift monitor.                                            | Stratified metrics by device ID (§58).                                                        |
| All grades predicted as 0                               | Collapse from imbalance or a broken loss mask.                                                               | Total failure.                         | Check sampling and loss masking.                                                                    | Prediction-distribution assertion in CI (§55).                                                |

_Table 44.1 — Failure taxonomy. Row 6 is included as a reminder that the most embarrassing failures are usually bugs, and that a unit test would have caught it._

## **44.3 Process**

1. After every evaluation run, automatically generate the stratified error tables. No manual analysis until the tables exist.
2. Rank strata by (error rate × stratum size) — this ranks by _total errors contributed_, which is what determines where effort pays off.
3. For the top three strata, pull ≥20 individual cases and review them with the full explanation artefacts. **Looking at the actual images is not optional**; the strata tell you where to look, not what is happening.
4. For each pattern found, write it into the taxonomy with a root-cause hypothesis and a validating experiment. A hypothesis without a designed experiment is an opinion.
5. Run the experiment. Record whether the hypothesis was supported. Keep the record even when it was not — the negative results are what stop the team re-testing the same idea in three weeks.

**Manual case review is the highest-yield hour in the project**

Twenty minutes looking at twenty misclassified images with their CAMs and lesion overlays will teach the team more than a week of hyperparameter search. It is also where every genuinely surprising finding in a medical imaging project comes from — and it is the thing most likely to be skipped under hackathon time pressure.

**PART IX**

# **Systems Engineering**

# **45\. Data Architecture**

Every entity the system produces, and how they relate, stated once, so that the database schema (§46), the API (§48) and the audit trail (R-13) are all describing the same model rather than three drifting approximations of it.

## **45.1 Core entities**

| **Entity**            | **Identity**                                      | **Mutability**                                                                        | **Owns**                                                                              |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Patient**           | Pseudonymous patient_id assigned at registration. | Demographic fields correctable; identity immutable.                                   | Zero or more Cases over time.                                                         |
| **Case**              | case_uuid, client-generated at capture (§32.2).   | Append-only after creation.                                                           | One or more Images (typically 2, one per eye); exactly one active Prediction lineage. |
| **Image**             | image_id + SHA-256 of the file.                   | **Immutable.** Derived artefacts are separate entities, never overwrite the original. | One QualityAssessment; zero or more DerivedImages (enhanced, overlay).                |
| **QualityAssessment** | image_id + attempt number.                        | Immutable once written.                                                               | Grade, feature vector, operator-facing reason.                                        |
| **Prediction**        | case_uuid + model_version.                        | Immutable once written; a re-run creates a new Prediction, never edits one.           | Ordinal probability vector, referable flag, triage level, calibration metadata.       |
| **Explanation**       | case_uuid + model_version.                        | Immutable.                                                                            | CAM tensor reference, lesion evidence reference, layer-agreement flag.                |
| **LesionFinding**     | case_uuid + lesion_index.                         | Immutable.                                                                            | Type, location, size, detection probability.                                          |
| **Report**            | case_uuid + model_version.                        | Immutable; re-rendering produces a new Report only if inputs changed.                 | Rendered PDF + structured JSON, byte-identical on identical inputs.                   |
| **ReviewDecision**    | case_uuid + reviewer_id + timestamp.              | Append-only. A correction is a new ReviewDecision, not an edit.                       | Final grade, agreement flag, override reason code, seconds spent.                     |
| **ModelArtefact**     | model_version (hash-derived).                     | **Immutable**, content-addressed.                                                     | Weights, preprocessing hash, temperature, τ\*, training config, dataset version.      |
| **DatasetVersion**    | Manifest hash (§8.1).                             | **Immutable.**                                                                        | Ingestion manifest, split assignment, provenance record.                              |
| **Device**            | device_id, registered per camera/laptop.          | Mutable metadata (location, field angle); identity fixed.                             | Stream of Cases and QualityAssessments, for drift attribution (§58).                  |
| **SyncRecord**        | case_uuid + payload_tier.                         | State machine: PENDING → IN_FLIGHT → ACKED.                                           | Upload state (§32.2).                                                                 |
| **AuditEvent**        | Monotonic sequence number.                        | **Append-only, never deleted.**                                                       | Every state-changing action: who, what, when, on which artefact version.              |

_Table 45.1 — Core entities. The immutability column is the load-bearing one: it is what makes the audit trail (R-13) actually reconstructible rather than merely intended._

## **45.2 Relationships**

Patient 1---\* Case 1---\* Image 1---1 QualityAssessment

| \\--\* DerivedImage (enhanced, overlay)

|

+---\* Prediction (one per model_version run)

| \\---1 Explanation

| \\---\* LesionFinding

|

+---\* Report (one per Prediction)

|

+---\* ReviewDecision (append-only history)

|

\\---\* SyncRecord (per payload tier)

Device 1---\* Case ModelArtefact 1---\* Prediction

DatasetVersion 1---\* ModelArtefact (every ModelArtefact records

the DatasetVersion it trained on)

AuditEvent references: any of the above, by (entity_type, entity_id, version)

_Figure 45.1 — Entity relationships. The Case is the aggregate root; almost everything else hangs off it._

## **45.3 Why Prediction, Explanation and Report are append-only**

**Immutability is the governance mechanism, not a database preference**

If a Prediction could be edited in place, "what did the model say about this case" would depend on when you asked. That single property is what R-13 (auditability) and §58 (drift monitoring, which compares predictions across time) both depend on.

The cost is storage — every re-run of a case keeps its history rather than overwriting it. At district scale (a few hundred cases/day, a few KB of structured data per Prediction) this cost is negligible, and it is one of the few places in this design where "just keep everything" is the correct engineering answer rather than a shortcut.

# **46\. Database Design**

## **46.1 Two databases, deliberately**

|                          | **Edge (screening node)**                                                                                                                                                          | **District node**                                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine                   | **SQLite**                                                                                                                                                                         | **PostgreSQL**                                                                                                                                                             |
| Why                      | Zero-administration, single-file, embeds in the compiled MATLAB app, survives power loss with WAL mode, no server process to keep alive on a laptop that may be rebooted mid-camp. | Concurrent writers (multiple sites syncing, the reviewer app, dashboards), proper user/role management, mature backup tooling, a district IT team can actually operate it. |
| Scale                    | One site, one operator, a few hundred cases/day.                                                                                                                                   | Tens of sites, a handful of reviewers, tens of thousands of cases/year.                                                                                                    |
| Availability requirement | Must work with zero network and zero DBA.                                                                                                                                          | Expected to be professionally administered.                                                                                                                                |
| Failure mode             | Corruption is a single-site, recoverable-from-sync-history problem.                                                                                                                | Backed up nightly; point-in-time recovery.                                                                                                                                 |

This is not "SQLite for MVP, PostgreSQL for scale" — both are the permanent design. The edge will always be SQLite, because the edge will always be one unattended laptop; the district will always be PostgreSQL, because the district will always have concurrent access patterns SQLite is not built for. Rule S1-style discipline applies here too: do not let the edge and district schemas silently diverge — both are generated from the same entity definitions in §45.1, with the district schema being the superset (it additionally tracks cross-site aggregates and reviewer assignment).

## **46.2 Edge schema (SQLite, abbreviated)**

CREATE TABLE cases (

case_uuid TEXT PRIMARY KEY,

patient_id TEXT NOT NULL,

device_id TEXT NOT NULL,

created_at TEXT NOT NULL, -- ISO 8601, UTC

laterality TEXT CHECK(laterality IN ('OD','OS','unknown'))

);

CREATE TABLE images (

image_id TEXT PRIMARY KEY,

case_uuid TEXT REFERENCES cases(case_uuid),

sha256 TEXT NOT NULL,

attempt_number INTEGER NOT NULL,

file_path TEXT NOT NULL -- relative, see Sec.47

);

CREATE TABLE quality_assessments (

image_id TEXT REFERENCES images(image_id),

grade TEXT CHECK(grade IN ('A','B','C')),

features_json TEXT NOT NULL, -- feature vector, Sec.9.3

reason TEXT, -- operator-facing, nullable

PRIMARY KEY (image_id)

);

CREATE TABLE predictions (

case_uuid TEXT REFERENCES cases(case_uuid),

model_version TEXT NOT NULL,

s1 REAL, s2 REAL, s3 REAL, s4 REAL, -- calibrated ordinal probs

triage_level TEXT CHECK(triage_level IN ('P0','P1','P2','P3')),

abstained INTEGER NOT NULL, -- 0/1

abstain_rule TEXT, -- which of E1-E9 fired, nullable

created_at TEXT NOT NULL,

PRIMARY KEY (case_uuid, model_version)

);

CREATE TABLE sync_queue (

case_uuid TEXT NOT NULL,

payload_tier INTEGER CHECK(payload_tier IN (1,2,3)),

state TEXT CHECK(state IN ('PENDING','IN_FLIGHT','ACKED','FAILED_PERMANENT')),

attempt_count INTEGER DEFAULT 0,

next_attempt_at TEXT,

PRIMARY KEY (case_uuid, payload_tier)

);

\-- PRAGMA journal_mode = WAL; survives app crash mid-write

\-- PRAGMA foreign_keys = ON;

_Figure 46.1 — Abbreviated edge schema. LesionFinding, Explanation, Report and AuditEvent tables follow the same pattern and are omitted for space._

## **46.3 District schema — what it adds**

- **\`sites\` and \`reviewers\` tables** with proper foreign keys, since the district coordinates many of each.
- **\`review_decisions\`** with a not-null reviewer_id foreign key and row-level security so a reviewer only sees their own assigned queue plus completed history, enforced by PostgreSQL row-level security policies rather than application logic alone (defence in depth).
- **Materialised views** for dashboard aggregates (daily referral rate, recapture rate by site, reviewer SLA compliance) refreshed on a schedule, so the dashboard (§51) never runs an expensive aggregate query against the live table.
- **\`audit_events\`** as a genuinely append-only table: INSERT-only grant, no UPDATE/DELETE grant, even for the application role. The database enforces the immutability §45.3 argues for, rather than relying on the application to behave.

## **46.4 Schema migration and versioning**

Migrations are forward-only, numbered, and applied via a migration tool rather than hand-edited SQL against a live database. Because ModelArtefact and Prediction records are immutable and content-addressed, a schema migration never needs to rewrite historical prediction data — it can add columns and tables without touching what is already there. This is a direct consequence of the append-only design in §45.3: it is what makes migrations low-risk instead of the usual source of production incidents.

# **47\. Image Storage**

## **47.1 What is stored, and where**

| **Artefact**             | **Format**                                               | **Mutability**                                                                  | **Location**                                                                  |
| ------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Original capture         | JPEG, native resolution, as the camera produced it.      | **Immutable, never overwritten, never re-encoded.**                             | Edge filesystem; synced to district object storage on demand (tier 3, §31.3). |
| Enhanced image (Grade B) | JPEG, derived.                                           | Immutable once produced; regenerable from the original + preprocessing version. | Edge filesystem cache; not routinely synced.                                  |
| Thumbnail                | JPEG, ~256px, for worklists.                             | Immutable, derived.                                                             | Synced in tier 1 (every case).                                                |
| Review-resolution image  | JPEG, ~1536px, quality-preserving.                       | Immutable, derived.                                                             | Synced in tier 2 (review cases only, §31.3).                                  |
| Grad-CAM overlay         | PNG with alpha channel, or vector overlay coordinates.   | Immutable, derived; regenerable from model_version + image.                     | Synced with tier 2 payload.                                                   |
| Lesion/anatomy overlay   | Vector (coordinates + type + probability), not a raster. | Immutable, derived.                                                             | Synced with tier 2 payload — a few hundred bytes, not an image.               |
| Report PDF               | PDF/A where feasible, for long-term archival stability.  | Immutable.                                                                      | District object storage; edge keeps a local copy until acknowledged.          |

_Table 47.1 — Image storage artefacts. Vector overlays rather than baked-in rasters for lesion markers, which keeps the tier-2 payload small (§31.3) and lets the reviewer UI toggle layers independently._

## **47.2 Why the original is sacrosanct**

**Never re-encode the original**

Every derived artefact — enhanced image, overlay, report figure — is generated from the original and can be regenerated. The original is the one thing that cannot be recreated if lost or altered, and it is the evidentiary record if a case is ever revisited months later. It is therefore never written to by any pipeline stage; every stage that "modifies" the image writes a new derived file. A single accidental imwrite back onto the source path is the kind of bug that a code-review checklist item and a read-only file permission both guard against, and this design uses both.

## **47.3 Directory and naming convention**

data/

images/

{device_id}/{yyyy}/{mm}/{dd}/{case_uuid}/

original_{attempt_n}.jpg immutable

enhanced_{attempt_n}.jpg derived, cached

thumb.jpg derived

review_1536.jpg derived

overlay_cam_{model_version}.png derived

overlay_lesions_{model_version}.json derived, vector

reports/

{case_uuid}/

report_{model_version}.pdf

report_{model_version}.json

audit/

{yyyy}/{mm}/audit_{dd}.ndjson append-only, one line per event

Object keys at the district mirror this path structure 1:1, so a case's

full artefact set is always addressable without a lookup table.

_Figure 47.1 — Storage layout. Deterministic paths from case_uuid and device_id mean no separate path index is needed._

## **47.4 Retention**

**Originals and reports.** Retained indefinitely at the district node — they are the clinical record. Retention beyond that is a governance decision for whoever operates the programme, not an engineering one, and this design does not hard-code a deletion policy.

**Derived artefacts (enhanced, overlays).** Regenerable, so they may be pruned from edge storage under disk pressure without any data loss — the pruning policy is simply "delete derived files for synced, acknowledged cases older than N days," and it is safe by construction because nothing downstream depends on the edge copy surviving.

**Edge originals after sync.** Retained at the edge until disk pressure requires pruning, and pruned oldest-acknowledged-first only. A case is never eligible for edge pruning before its tier-3 upload is ACKED.

# **48\. API Architecture**

## **48.1 Two very different "APIs"**

It is tempting to design one API and use it everywhere. That would be a mistake here, because the edge and the district have almost nothing in common as integration surfaces.

| **Surface**                         | **Nature**                                                                                                                                                             | **Why**                                                                                                                                                                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Edge: in-process function calls** | The Technician App and the pipeline modules (+preprocess, +quality, … +report) run in the **same MATLAB process**. There is no HTTP, no serialisation, no network hop. | A screening node is one application. Introducing HTTP between the UI and the pipeline on the same laptop would add latency, failure modes and code for zero benefit — exactly the kind of complexity §64 exists to reject. |
| **District: a small REST API**      | The Reviewer App, dashboards, and any future integration (LIS, HMIS) talk to the district backend over HTTP.                                                           | Multiple independent clients, genuine network boundary, need for auth and versioning.                                                                                                                                      |

## **48.2 District REST API — endpoint summary**

| **Endpoint**                          | **Method** | **Purpose**                                                                                                                     |
| ------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| /api/v1/cases                         | GET        | List cases, filterable by site, date range, triage level, review status.                                                        |
| /api/v1/case/{case_uuid}              | GET        | Full case detail: images (by tier), prediction, explanation, lesion findings, report.                                           |
| /api/v1/case/{case_uuid}/image/{tier} | GET        | Fetch a specific image tier; tier 3 triggers an on-demand pull from the edge if not already synced (§31.3).                     |
| /api/v1/queue                         | GET        | The authenticated reviewer's prioritised worklist (§39.2).                                                                      |
| /api/v1/case/{case_uuid}/review       | POST       | Submit a ReviewDecision. Idempotent on (case_uuid, reviewer_id, decision_uuid).                                                 |
| /api/v1/report/{case_uuid}            | GET        | Fetch the rendered report (PDF or JSON via Accept header).                                                                      |
| /api/v1/model                         | GET        | Currently deployed model_version per site, with rollout status.                                                                 |
| /api/v1/sync/{site_id}                | POST       | Edge sync ingress — idempotent upsert by case_uuid + payload_tier (§32.2).                                                      |
| /api/v1/metrics                       | GET        | Aggregate operational metrics for dashboards (§51) — served from the materialised views in §46.3, never from a live table scan. |
| /healthz                              | GET        | Liveness/readiness probe.                                                                                                       |

_Table 48.1 — District API surface. Small deliberately: this is a reviewer tool and a sync ingress, not a general-purpose platform API._

## **48.3 How the district API relates to MATLAB**

The district node does not run inference. The API server (a lightweight web framework, §49) is a thin layer over PostgreSQL and object storage; it serves what the edge already computed and synced. The only place MATLAB executes at the district is **offline batch re-processing** — for example, re-scoring a backlog against a newly promoted model version during a controlled rollout (§57) — invoked as a scheduled job, never inline with an API request. This keeps the request path free of MATLAB startup latency and licensing concerns entirely.

## **48.4 Versioning and stability**

- The API is versioned in the path (/api/v1/…) from day one, even though there is exactly one consumer (the Reviewer App) initially — because the second consumer (a future LIS/HMIS integration, explicitly out of scope for the MVP but not precluded) should not require a breaking change to the first.
- Responses are versioned JSON with an explicit schema_version field, independent of the URL version, so additive fields can be introduced without a path bump.
- The sync ingress endpoint (/sync) is the one with the strongest backward-compatibility requirement, since edge nodes may run an older app version than the district for weeks after a rollout — it accepts a range of payload schema versions explicitly, not just the latest.

# **49\. Technology Stack**

## **49.1 The stack, with justification and the alternative considered**

| **Layer**                        | **Choice**                                                                                                               | **Why**                                                                                                                       | **Alternative considered**                   | **Why not**                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core pipeline                    | **MATLAB** (Image Processing, Computer Vision, Deep Learning, Statistics & ML Toolboxes)                                 | Mandated by the problem statement; genuinely well-matched (§34.1).                                                            | Python (OpenCV/PyTorch)                      | Contradicts the problem statement; would also forfeit gradCAM, fibermetric and bootci as built-ins.                                                |
| Workflow simulation              | **Simulink + SimEvents**                                                                                                 | Mandated; correct paradigm for a queueing network (§36.1).                                                                    | Custom discrete-event code                   | Reinvents SimEvents poorly and is not a Simulink deliverable.                                                                                      |
| Edge deployment                  | **MATLAB Compiler + MATLAB Runtime**                                                                                     | No per-site licence cost; genuinely deployable (§33.4).                                                                       | Full MATLAB install per site                 | Licence cost and management burden at every rural site — not viable at district scale.                                                             |
| Edge database                    | **SQLite**                                                                                                               | Zero-admin, embeds in the compiled app, WAL survives crashes (§46.1).                                                         | Embedded PostgreSQL, local NoSQL store       | Unnecessary operational weight for a single-writer, single-machine workload.                                                                       |
| District database                | **PostgreSQL**                                                                                                           | Mature, concurrent, row-level security, strong backup story (§46.1).                                                          | MySQL/MariaDB                                | Comparable option; PostgreSQL's row-level security fits the reviewer-isolation requirement (§46.3) more directly.                                  |
| Object/file storage              | **Filesystem at edge; S3-compatible object storage at district**                                                         | Simple at the edge; standard, portable, and works with on-prem MinIO or a cloud provider at the district without code change. | Store images as database BLOBs               | Bloats the database, complicates backup, and gains nothing — files are already content-addressed by SHA-256.                                       |
| District API server              | A lightweight web framework (language chosen for team familiarity — Node.js/Express or Python/FastAPI are both adequate) | The API surface is small (Table 48.1) and does no heavy computation; framework choice here is genuinely low-stakes.           | A MATLAB-hosted web server                   | MATLAB is not built to be a long-running multi-tenant web server; keeping it out of the request path also keeps licensing out of the request path. |
| Reviewer web app                 | Standard web frontend framework, server-rendered or SPA per team preference                                              | Runs in a browser at the district hospital; no mobile requirement identified.                                                 | MATLAB App Designer for the reviewer app too | App Designer is right for the technician app (single-machine, tight pipeline coupling) but a poor fit for a multi-user browser-based worklist.     |
| Auth                             | Standard token-based auth (e.g. OAuth2/JWT) at the district API; local OS-level access control at the edge               | Matches the two very different trust boundaries (§52).                                                                        | Shared static credentials                    | Rejected outright on security grounds.                                                                                                             |
| Containerisation (district only) | Optional — the API server and PostgreSQL may be containerised for ease of deployment.                                    | Standard ops convenience.                                                                                                     | Kubernetes                                   | A district node is one or two machines. Orchestration overhead with no orchestration need (§64).                                                   |

_Table 49.1 — Technology stack. Every "why not" column entry is a rejected-complexity decision, consistent with §64._

## **49.2 What is explicitly not in the stack**

- No message broker (Kafka, RabbitMQ) — the sync protocol's idempotent upsert (§32.2) does the job of a queue without the operational overhead of one.
- No microservice framework or service mesh — the district API is one deployable service.
- No feature store — there are no online features computed outside the model itself.
- No vector database — there is no embedding-similarity search in the product surface (Mahalanobis OOD scoring in §22.2/§41.3 is a small in-process computation, not a retrieval system).
- No LLM anywhere in the pipeline — reports are template-rendered (§26.2) specifically to avoid the hallucination risk an LLM would introduce into a clinical document.

# **50\. Observability**

## **50.1 What is collected**

| **Signal**                 | **Collected where**                  | **Granularity**                                               | **Feeds**                                                                      |
| -------------------------- | ------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Stage timing               | Edge, every pipeline stage (§34.3)   | Per case, per stage, milliseconds                             | Latency dashboards (§51); Simulink parameter calibration (§37.1)               |
| Stage outcome / errors     | Edge, every stage                    | Per case, per stage: success / degraded / failed              | Reliability tracking (§54); alerting                                           |
| Quality grade distribution | Edge                                 | Per case                                                      | Recapture-rate dashboard; quality-confound audit (§9.6)                        |
| Prediction distribution    | Edge, logged; aggregated at district | Per case: grade, referable flag, confidence, abstention       | Drift monitoring (§58)                                                         |
| Reviewer actions           | District                             | Per ReviewDecision: agreement, override reason, seconds spent | Reviewer-time tracking (§25.4 in production); automation-bias monitoring       |
| Sync health                | Edge + district                      | Per SyncRecord: attempts, latency, failures                   | Backlog dashboard; outage detection                                            |
| System resource usage      | Edge + district                      | CPU, memory, disk free, sampled periodically                  | Capacity alerts (disk-full is the single most common rural-deployment failure) |
| Model integrity checks     | Edge, at load                        | Pass/fail against expected hash                               | Security/integrity alerting (§28.4)                                            |

## **50.2 Where it goes, given intermittent connectivity**

EDGE: structured logs written locally (NDJSON, one line per event),

rotated and size-capped. These are NOT lost if never synced -- they

are diagnostic, not authoritative; the authoritative record is the

SQLite database itself, which syncs via the normal case pipeline.

DISTRICT: aggregates computed from synced case/prediction/review data

(already durable via Sec.46.3's materialised views), plus edge log

bundles pulled opportunistically for deep debugging of a specific

site issue -- these are diagnostic exhaust, not part of the primary

sync path, and are never required for the clinical workflow to

function.

RATIONALE

Observability data must never compete with clinical data for the

limited uplink (Sec.31.3). It rides along at low priority, and its

loss (e.g. an edge log rotated away before ever syncing) degrades

debugging, never patient care.

_Figure 50.1 — Observability data flow. Deliberately second-class relative to clinical data on the sync path._

## **50.3 Alerting**

| **Condition**                                                 | **Severity**       | **Action**                                                                                    |
| ------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| Recapture rate at a site exceeds baseline by a defined margin | Warning            | Flag for programme manager — likely equipment or training issue (§36.4).                      |
| Disk free below a threshold at the edge                       | Warning → Critical | Warn early; block new capture only as an absolute last resort (never silently fail mid-case). |
| Sync backlog age exceeds N days for any site                  | Warning            | Investigate connectivity or a stuck sync agent.                                               |
| Model integrity check fails at load                           | Critical           | Refuse to start inference; fall back to the last verified model version.                      |
| Audit-sample sensitivity falls below floor (§28.3)            | Critical           | Triggers the rollback procedure (§28.4).                                                      |
| Reviewer SLA breach rate rises                                | Warning            | Surface on the programme-manager dashboard; may indicate understaffing (§38).                 |
| Any escalation rule (E1–E9) fires at an anomalous rate        | Warning            | Investigate — could be a genuine population shift or a pipeline bug.                          |

# **51\. Dashboards**

## **51.1 Two audiences, two dashboards**

| **Dashboard**             | **Audience**                              | **Shows**                                                                                                                                                                                             | **Explicitly does not show**                                                                                                                                          |
| ------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Programme dashboard**   | District programme manager, non-technical | Patients screened (daily/monthly), referral volume, recapture rate by site, reviewer backlog and SLA compliance, coverage vs district target, cost-per-patient trend (§56).                           | Model internals — QWK, loss curves, confusion matrices. Not actionable for this audience and would obscure the operational signal.                                    |
| **Engineering dashboard** | Engineering/QA team                       | Latency percentiles by stage, error rates by stage, quality-grade distribution drift, prediction-distribution drift (§58), model version rollout status, sync health, audit-sample performance trend. | Individual patient data beyond what is needed to debug a flagged case — the engineering view is aggregate-first, drilling into a specific case only on investigation. |

## **51.2 Design principle**

**A dashboard of model metrics a programme manager cannot act on is worse than no dashboard**

This was named explicitly as a failure mode in §3.3 ("what would make them abandon it"). Every widget on the programme dashboard is designed backwards from a decision it should inform: recapture rate informs an equipment/training conversation; SLA compliance informs a staffing conversation; coverage informs an outreach-planning conversation. A metric with no attached decision does not get a widget.

# **52\. Security Architecture**

## **52.1 Threat model, by asset**

| **Asset**                                    | **Threat**                                                       | **Mitigation**                                                                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Retinal images + demographics at rest (edge) | Laptop lost or stolen.                                           | Full-disk encryption; application-level encryption of the image directory; screen lock enforced by policy.                                         |
| Data in transit (sync)                       | Interception on an untrusted network (public WiFi, mobile data). | TLS for all sync and API traffic; certificate pinning where feasible on the compiled edge app.                                                     |
| District database                            | Unauthorised access, SQL injection, privilege escalation.        | Parameterised queries only (no dynamic SQL); PostgreSQL role-based access with least privilege; row-level security for reviewer isolation (§46.3). |
| Reviewer credentials                         | Credential theft, weak passwords, session hijacking.             | Token-based auth with short-lived access tokens and refresh tokens; MFA recommended for district-level accounts; session invalidation on logout.   |
| Model artefact                               | Tampering to degrade or backdoor predictions.                    | Hash verification at load (§28.4); artefacts distributed only from the signed model registry.                                                      |
| Sync ingress endpoint                        | Spoofed case uploads, replay attacks, denial of service.         | Per-site authenticated credentials; idempotency by case_uuid limits replay damage to a no-op; rate limiting.                                       |
| Audit log                                    | Tampering to hide an incident.                                   | Append-only at the database grant level (§46.3); write-once semantics; periodic export to write-once storage at the district for defence in depth. |
| Physical access to a screening site          | Unauthorised viewing of patient images on-screen.                | Auto-lock; the technician app shows only the current patient's data, never a browsable gallery.                                                    |

_Table 52.1 — Threat model by asset. This is a working security posture for a prototype, not a certified clinical-device security assessment (§2.3 non-goals)._

## **52.2 Access control model**

**Edge.** Single-operator device. Access control is OS-level (device passcode/login) plus application-level (the technician app exposes no configuration surface, so there is nothing sensitive to misconfigure even with device access).

**District — roles.** Reviewer (sees own queue + own history); Programme manager (sees aggregates, not raw images); Engineering/admin (full access, individually audited). Roles are enforced at the database layer (row-level security), not only in application code, so a bug in the API cannot silently leak cross-reviewer data.

**Principle of least privilege.** No role has more access than its function requires. In particular, the programme-manager role has no path to individual patient images — the programme dashboard (§51.1) is aggregate by construction, not by convention.

# **53\. Privacy**

## **53.1 Data minimisation**

- **Pseudonymous identifiers throughout the pipeline.** patient_id and case_uuid are opaque identifiers; no patient name, address, or other direct identifier is stored alongside image or prediction data in the research/engineering data path. Identity resolution, where needed clinically, is a separate concern owned by the health facility's existing patient-registration system, not by this pipeline.
- **No unnecessary metadata retention.** EXIF fields beyond what quality assessment needs (timestamp, device) are stripped on ingestion rather than carried through indefinitely.
- **Aggregation by default for anything leaving the clinical boundary.** Dashboards, reports to funders, and any research use of the data are aggregate; case-level data does not leave the district node's controlled environment as a matter of routine operation.

## **53.2 Regulatory awareness**

Retinal images combined with demographic and health information constitute sensitive personal data under India's Digital Personal Data Protection framework and under general medical-records practice. This design does not constitute a compliance certification — that requires a legal and regulatory review this document does not attempt — but it is built so that a compliance review has something reasonable to review: pseudonymisation, encryption, access control, audit logging and data minimisation are architectural properties from Phase 1, not retrofits.

## **53.3 Patient-facing considerations**

| **Consideration**                                 | **How the design addresses it**                                                                                                                                                                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Consent                                           | Out of scope for this engineering blueprint (a clinical-operations concern) but the pipeline does not preclude a consent-capture step at registration — it is a natural extension of the existing registration stage (§30.1, stage 1).                                   |
| Right to explanation of an AI-influenced decision | Directly supported — the explanation layer (§24) exists partly for this reason, and every report includes the rationale categories from Table 24.1.                                                                                                                      |
| Data retention limits                             | Retention policy is a governance decision (§47.4); the architecture supports deletion (removing a Case and its dependents) without breaking referential integrity, since AuditEvent references are by ID and can record "deleted" without retaining the deleted content. |

# **54\. Reliability and Failure Modes**

This section is the systems-engineering counterpart to §28 (Clinical Safety Architecture). §28 asks "does a failure ever harm a patient" and answers no by routing every failure to a human. This section asks "does a failure ever lose data, corrupt state, or take the system down," and is answered by redundancy and graceful degradation rather than by human review.

## **54.1 Failure mode catalogue**

| **Failure**                           | **Detection**                                                         | **Impact if unhandled**                                                                    | **Mitigation**                                                                                                                            |
| ------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Power loss mid-write (edge)           | SQLite integrity check on next start.                                 | Partial case record.                                                                       | WAL journal mode makes writes atomic; a torn write rolls back cleanly on restart, never leaving a half-written row.                       |
| Disk full (edge)                      | Free-space monitoring (§50.3).                                        | New captures fail; existing data at risk if the failure is not surfaced.                   | Proactive alerting well before zero; capture blocked with a clear operator message before any write can fail destructively.               |
| Laptop hardware failure (edge)        | Device stops syncing; district notices via the sync-health dashboard. | Site is down; unsynced cases at risk if the disk is unrecoverable.                         | Frequent, opportunistic sync minimises the unsynced window; spare-hardware provisioning is an operational, not architectural, mitigation. |
| Network partition (edge ↔ district)   | Sync attempts fail; retried with backoff.                             | None to the clinical workflow — this is the expected steady state, not an exception (§32). | Offline-first design; the "failure" is designed for, not merely handled.                                                                  |
| District database unavailable         | API health check fails.                                               | Reviewer app and dashboards degrade; edge sites are unaffected (they queue locally).       | Standard PostgreSQL HA/backup practice; the edge's independence from district availability is the key architectural mitigation.           |
| Object storage unavailable (district) | Upload/fetch errors.                                                  | Tier-2/3 images temporarily unfetchable; case metadata (in PostgreSQL) still available.    | Metadata and blob storage are decoupled deliberately, so one failing does not block the other.                                            |
| Model artefact corrupted in transit   | Hash mismatch at load (§28.4).                                        | Would silently degrade predictions if unchecked.                                           | Load refused; previous verified version used instead.                                                                                     |
| Duplicate case upload (retry storm)   | N/A — handled by design.                                              | Would create duplicate records if not idempotent.                                          | Idempotent upsert by case_uuid (§32.2) makes this a non-event by construction.                                                            |
| Clock skew between edge and district  | Server-assigned sequence numbers diverge from device timestamps.      | Incorrect event ordering if timestamps were trusted.                                       | Ordering uses server-assigned sequence numbers, not device clocks (§32.2).                                                                |
| Reviewer app crash mid-review         | Session state lost.                                                   | An in-progress (unsaved) review is lost; nothing already submitted is affected.            | Draft auto-save on the reviewer app; submitted ReviewDecisions are already durable and unaffected.                                        |

_Table 54.1 — Failure mode catalogue. Contrast with Table 28.1: that table is organised by clinical hazard, this one by engineering failure — several rows share a root cause but the concern is different (data integrity here, patient safety there)._

## **54.2 Redundancy and recovery targets**

**Edge.** No redundant hardware assumed (rural procurement reality, §31.1). Recovery is: replace the laptop, restore the app, resume from the last synced case — the district node is the durable copy of record for anything already synced.

**District database.** Nightly backups with point-in-time recovery; **TARGET** recovery point objective (RPO) of 24 hours, recovery time objective (RTO) of 4 hours — modest targets appropriate to a non-emergency-care workflow where the edge nodes continue operating independently during a district outage.

**Object storage.** Standard replication of whatever storage backend is chosen (§49.1); originals additionally exist at the edge until pruned, providing a secondary copy during the retention window.

**Model registry.** Every promoted model version retained indefinitely (§35), so rollback (§28.4) is always to a known-good, already-verified artefact — never a re-download or a re-train under pressure.

# **55\. Testing Strategy**

A pipeline this long fails silently in the middle far more often than it fails loudly at the edges. The testing strategy is built around that fact: every layer gets tests appropriate to what it can silently get wrong.

## **55.1 Test layers and acceptance criteria**

| **Layer**             | **What it tests**                                                    | **Example**                                                                                                                         | **Acceptance criterion**                                                                                                           |
| --------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**              | Individual functions in isolation.                                   | quality.assess returns Grade C for a synthetically blurred image above a known threshold.                                           | 100% of public functions in +quality, +anatomy, +vessels, +lesions, +triage have at least one unit test; all pass on every commit. |
| **Image processing**  | Deterministic CV operations against known fixtures.                  | Field mask on a fixture image matches a hand-verified ground-truth mask within a tolerance.                                         | Masking IoU ≥ 0.98 on fixture set; illumination normalisation leaves lesion contrast within the §10.4 bound.                       |
| **Segmentation**      | Vessel/disc/fovea localisation against DRIVE and IDRiD ground truth. | Vessel Dice on the DRIVE test set.                                                                                                  | Reported metric within a defined tolerance of the last known-good run — a regression here fails the build (§55.4).                 |
| **Model**             | The trained classifier's behaviour on fixed inputs.                  | A held-out fixture batch produces the same ordinal probabilities (within floating-point tolerance) as the last verified checkpoint. | Golden-output regression test; any change requires an explicit, reviewed re-baseline, never a silent update.                       |
| **XAI**               | Explanation generation correctness — not quality, which is §25.      | CAM energy outside the field-of-view mask is zero (catches the exact bug found in error analysis, §44.2).                           | Zero energy outside mask on every fixture; CAM shape matches the expected grid size for the configured input resolution.           |
| **API**               | District endpoint contracts.                                         | POST /review is idempotent under a retried identical request.                                                                       | Full contract test suite passes; schema validation on every response.                                                              |
| **Integration**       | Multi-module composition.                                            | Quality → enhance → anatomy → lesions → classify runs end-to-end on a fixture set without stage-boundary type mismatches.           | All fixture cases process without unhandled exceptions.                                                                            |
| **End-to-end**        | Image in, report out, via the compiled application.                  | Run the packaged edge app against a fixture image; verify a report is produced and matches the expected structured JSON.            | Passes on every release candidate before packaging.                                                                                |
| **Performance**       | Latency and throughput against the budget (§33.2).                   | P95 end-to-end latency on the Standard hardware profile.                                                                            | Within TARGET budget; a regression beyond a defined margin fails the build.                                                        |
| **Stress**            | Behaviour under sustained or peak load.                              | Sustained processing at camp-day volume (§33.1) for the full simulated day without memory growth or crash.                          | No unbounded memory growth; no crash; degraded gracefully if at all.                                                               |
| **Failure injection** | Deliberate fault injection against the catalogue in Table 54.1.      | Kill the process mid-write; verify SQLite WAL recovery on restart.                                                                  | Every row in Table 54.1 has a corresponding injected-failure test.                                                                 |
| **Regression**        | Golden outputs across the whole pipeline.                            | A fixed fixture set's full output (grades, explanations, reports) diffed against the last approved baseline.                        | No unreviewed diff ships; diffs are either approved (re-baseline) or rejected (bug).                                               |
| **Simulation**        | Simulink model behaviour.                                            | Scenario A (§40.1) reproduces its expected qualitative shape (comfortable utilisation) across repeated seeded runs.                 | Replication variance within an expected band; no scenario silently changes behaviour between Simulink versions without review.     |

_Table 55.1 — Testing layers. Twelve layers sounds like a lot for a hackathon-timescale project; in practice most are a handful of tests each, and the XAI-layer example is a real bug this project already found by having the test category exist (§44.2)._

## **55.2 Test data**

- Small, committed fixture images (tests/fixtures/) so the full test suite runs without the full datasets present — essential for CI and for any collaborator who has not downloaded APTOS/IDRiD/DRIVE/Messidor-2.
- Fixtures span the quality grades (A/B/C), a range of severities, and at least one known-degenerate case (all-black, all-white, wrong aspect ratio) to catch the "silently accepts garbage" failure mode.
- Golden outputs are versioned alongside the code that produced them, so a regression test failure is always diffable against a specific commit.

## **55.3 What "done" means for a module**

**The integration gate**

From §34.3: "a module without tests does not get integrated." Concretely: a pull request touching +quality, +anatomy, +vessels, +lesions, +classify, +calibrate, +explain, +triage, +report, or +store must include or update the corresponding unit tests, and CI must be green, before merge. This is enforced by process, not by tooling that does not exist yet — but stating it as a hard gate here is what makes it enforceable at all.

## **55.4 Continuous integration**

Every commit runs: unit + image-processing + XAI + API + integration tests (fast, <10 minutes). Segmentation, model-regression, end-to-end, and performance tests run on every merge to the main branch (slower, uses larger fixtures). Stress, failure-injection, and simulation tests run nightly or before a release candidate, since they are the most expensive and the least likely to be affected by a small code change.

# **56\. Cost, Resource Analysis, and Throughput Engineering**

The performance engineering itself — latency budgets, optimisation levers, hardware profiles — is covered in §33, because it is inseparable from the edge deployment design. This section asks the question §33 does not: what does a district actually have to spend, and what does the AI change about that number?

## **56.1 Where the money goes**

| **Cost category**                | **Order of magnitude**                                                                                                                              | **Driven by**                                                                           | **Sensitive to the AI?**                                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Fundus cameras                   | **Dominant hardware cost.** A portable fundus camera is typically the single most expensive line item per screening station.                        | Number of stations (§37.2: ~10 for a 100,000-patient district).                         | No — camera cost is identical with or without AI.                                                                                      |
| Screening-site compute (laptops) | Minor relative to cameras. A Standard-profile laptop (§33.1) is commodity hardware.                                                                 | Number of stations.                                                                     | Marginally — the AI requires a laptop that would often be provisioned anyway for the technician workflow.                              |
| District server + storage        | Small, one-time plus modest ongoing.                                                                                                                | One per district.                                                                       | No — this cost exists for record-keeping regardless of AI.                                                                             |
| GPU hardware                     | **Zero, by design.** The system targets CPU-only operation (§33); GPU is an optional throughput improvement at the Camp profile, not a requirement. | Only if a site opts in.                                                                 | This is a direct consequence of the AI/ML architecture choices in Part IV (resolution-over-model-size, EfficientNet-B0).               |
| Ophthalmologist time             | **The cost the AI exists to reduce.** Ophthalmologist-hours are the scarcest and most expensive resource in the entire system (§3.4).               | Reviewer FTE requirement — a direct output of the Simulink capacity model (§37, §38.2). | **Yes — this is the main lever.** The specificity-to-staffing curve (§38.2) is literally cost engineering expressed as a model metric. |
| Connectivity                     | Small, ongoing.                                                                                                                                     | Data volume, which the tiered upload scheme (§31.3) reduces ~17×.                       | Yes, directly — this is a cost saving the architecture produces, not just a latency one.                                               |
| Technician time                  | Ongoing, but largely fixed regardless of AI (someone must capture the image either way).                                                            | Recapture rate is the main AI-sensitive component (§36.4).                              | Marginally — a rising recapture rate is a real cost the quality module exists to keep low.                                             |

_Table 56.1 — Cost drivers. The pattern: hardware cost is essentially AI-independent (cameras dominate regardless), while the ongoing operating cost the AI actually moves is ophthalmologist time — which is exactly the resource Part VII's capacity model is built to quantify._

## **56.2 Cost per patient screened — the framing that matters**

FIXED COSTS (approximately AI-independent)

cameras, stations, district server, connectivity infrastructure

\-> amortised over patients screened; falls as volume rises

VARIABLE COST THE AI DIRECTLY REDUCES

ophthalmologist review time per patient

WITHOUT AI: ~3 min/patient x ophthalmologist hourly cost

WITH AI: ~30 s/patient x ophthalmologist hourly cost (Sec.3.5)

\-> roughly a 6x reduction in the single most expensive

per-patient line item, BEFORE accounting for the reduced

FTE headcount the Simulink model shows is achievable (Sec.37.2)

VARIABLE COST THE AI CAN INCREASE IF POORLY TUNED

recapture rate -> technician time -> Sec.36.4's non-linear queueing

\-> this is precisely why quality-module tuning is a cost lever,

not just an accuracy lever

THE HONEST BOTTOM LINE

Cost-per-patient is dominated by camera amortisation at low volume

and by ophthalmologist time at any volume the AI does not address.

The AI's economic case is strongest exactly where the arithmetic in

Sec.3.5 says it is strongest: making one ophthalmologist sufficient

for a district that would otherwise need several.

_Figure 56.1 — Cost-per-patient framing. Deliberately qualitative where quantitative claims would require real procurement figures this document does not have._

## **56.3 Throughput — the summary view**

Detailed latency budgets, hardware profiles and optimisation levers are §33's content and are not repeated here. The throughput conclusion that matters at the systems level, established jointly by §33.5 and the Simulink capacity model (§37.2), bears restating because it is the finding that reorganises where engineering effort should go:

**Restated from §33.5 and §37.2**

A single compute node handles the AI processing load of an entire 100,000-patient district roughly 6.5× over. The system-level throughput constraint is never the AI. It is, in order: camera/technician capture capacity, then ophthalmologist review capacity. Cost and performance engineering effort is correctly spent on recapture-rate reduction and reviewer-workflow efficiency — not on shaving milliseconds off inference.

**PART X**

# **MLOps and Model Lifecycle**

# **57\. MLOps Lifecycle**

A model that cannot be reproduced, traced, or safely replaced is not production software, regardless of how good its metrics look on the day it was trained. This section defines the lifecycle a model version moves through, from data to deployment to retirement.

## **57.1 Versioning — what gets a version, and what identifies it**

| **Artefact**                   | **Version identity**                                                                                                                           | **Set at §**            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Dataset                        | Hash of the ingestion manifest.                                                                                                                | §8.1, §8.6              |
| Preprocessing configuration    | Semantic version + hash of the config struct.                                                                                                  | §8.6, §10.6             |
| Model weights                  | Content-addressed hash of the trained artefact.                                                                                                | §45.1 (ModelArtefact)   |
| Calibration (temperature, τ\*) | Bundled into the ModelArtefact — never applied loose.                                                                                          | §18.1, §21.3, §22.2     |
| Full model artefact            | model_version = a single identifier binding weights + preprocessing hash + temperature + τ\* + training config + dataset version + git commit. | §35 (models/ directory) |
| Simulink model                 | Version-controlled .slx alongside code; scenario parameter sets are versioned separately from the model structure.                             | §35                     |

**One identifier, not five**

A model_version is deliberately a single opaque string that resolves to everything needed to reproduce a prediction byte-for-byte: weights, preprocessing, calibration, thresholds. Splitting these into independently-versioned pieces is how systems end up serving weights from one version with preprocessing from another — the exact hazard flagged in Table 28.1 ("Wrong preprocessing served with a model"). Bundling them into one immutable artefact makes that failure mode structurally impossible rather than merely policed.

## **57.2 Experiment tracking**

Every training run records: dataset version, preprocessing version, full hyperparameter set, seed, git commit, and the resulting metrics (§20's four families) on validation. This is written to experiments/ (§35) as structured, machine-written records — never hand-edited, per the structural rule already established for that directory. A run that is not recorded this way is not eligible for promotion, regardless of how good its numbers looked in a terminal.

## **57.3 Evaluation gates**

A candidate model advances from "trained" to "promotable" only by passing gates evaluated on the validation split (never test, per §8.3):

| **Gate**                      | **Requirement**                                                                                                                                         | **Rationale**                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Discrimination                | QWK and referable-DR AUC not worse than the current production model by more than a defined noise margin (from the ≥3-seed variance, §43.3).            | Prevents replacing a working model with a within-noise "improvement" — the same discipline as §16.5's ensemble acceptance rule.                  |
| Calibration                   | ECE after temperature scaling within a defined bound (§22).                                                                                             | An undercalibrated model makes the abstention and escalation thresholds (§22.3, §27.3) meaningless.                                              |
| Coverage-adjusted sensitivity | Sensitivity at the frozen operating-point _methodology_ (§21.3) meets the ≥90% floor with its lower CI bound, on this candidate's own validation split. | The threshold-selection procedure is re-run per candidate, not inherited — a new model needs its own τ\*.                                        |
| Regression suite              | Golden-output regression tests (§55.1) reviewed and re-baselined only if the diff is an intended change.                                                | Catches unintended behaviour changes a metric alone would not surface.                                                                           |
| Explanation validation        | Localisation and stability metrics (§25.2, §25.3) not worse than the current production model.                                                          | A more accurate but less explainable model may not be a net improvement, given how load-bearing explainability is for reviewer throughput (§24). |
| Performance budget            | Latency within the TARGET envelope (§33.2) on the Standard hardware profile.                                                                            | A model that is more accurate but blows the latency budget breaks the same-visit-result requirement (§31.1).                                     |

_Table 57.1 — Promotion gates. All six must pass; there is no override that skips a gate for a model that "seems obviously better."_

## **57.4 Promotion and rollout**

CANDIDATE MODEL (passed all gates on validation)

|

v

STAGED: deployed to a small subset of sites (or district-node batch

re-scoring of recent cases, Sec.48.3) alongside the production

model, predictions logged but NOT surfaced to reviewers

|

v

SHADOW COMPARISON: candidate vs production on live-distribution data

for a defined window; agreement rate and any divergence reviewed

|

v

DECISION

divergence acceptable --> PROMOTE: becomes production model_version

for new sites first, then rolled out

divergence concerning --> investigate before proceeding (this is

exactly what Table 57.1's regression gate

exists to catch earlier, but shadow

comparison is the live-data backstop)

|

v

PRODUCTION: previous version retained and loadable at every site

(never deleted, Sec.28.4) -- rollback is a config change

_Figure 57.1 — Promotion pipeline. The previous version is never deleted, which is what makes rollback (§28.4) instantaneous rather than a redeployment._

## **57.5 Evidence-based retraining triggers**

Retraining is triggered by evidence, not by a calendar. A model is not retrained "every quarter" for its own sake — that invites exactly the confirmation-loop risk flagged in §27.4. Retraining is triggered by:

| **Trigger**                                           | **Source**                                              | **What it means**                                                                                                                                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drift alarm sustained beyond a defined window         | Drift monitors, §58                                     | The deployment distribution has moved enough that the current model's validity is in question.                                                                                                                 |
| Audit-sample sensitivity degradation                  | P3 audit sampling, §28.3                                | Direct evidence of declining real-world performance.                                                                                                                                                           |
| A blinded re-graded label batch becomes available     | §27.4's blinded re-grading protocol                     | New, trustworthy training signal exists — this is the _only_ sanctioned path from production reviewer activity back into training data, precisely because it is blinded and therefore not a confirmation loop. |
| A new dataset or dataset correction becomes available | External (e.g. a corrected Messidor-2 label file, §6.1) | The evidence base itself changed.                                                                                                                                                                              |
| A systematic error pattern is confirmed               | Error analysis, §44                                     | A specific, understood failure mode exists that retraining (with a targeted fix — augmentation, loss weighting, architecture change) can plausibly address.                                                    |

_Table 57.2 — Retraining triggers. Every trigger is a piece of evidence, not a schedule — consistent with the pre-specification discipline in §43.3._

# **58\. Model Drift**

A model that was valid at Phase 9 does not stay valid forever. Populations shift, cameras change, seasons change disease mix. Drift monitoring is what turns "the model might be degrading" from a worry into a measured, actionable signal.

## **58.1 Drift types and how each is measured**

| **Drift type**             | **What changes**                                                                                 | **How it is measured**                                                                                                                                                           | **Data needed**                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Input drift**            | The distribution of raw images changes (new camera model, new population).                       | Distributional distance (e.g. population statistics of the quality feature vector, §9.3) between a recent window and the training/reference distribution.                        | Label-free — usable on the unlabelled APTOS test images as a rehearsal, and on live unlabelled deployment data in production (§6.1's label-free use case, realised here). |
| **Quality drift**          | The mix of quality grades shifts (e.g. rising Grade C rate).                                     | Time series of grade distribution per site/device, compared to that site's own baseline.                                                                                         | Label-free.                                                                                                                                                               |
| **Camera/device drift**    | A specific device's output characteristics change (dirty lens, miscalibration, firmware update). | Per-device stratified quality and prediction distributions (§44.1's device axis, applied continuously rather than only in post-hoc error analysis).                              | Label-free.                                                                                                                                                               |
| **Class/prevalence drift** | The true severity mix in the screened population changes (seasonal, outreach-targeting effects). | Distribution of predicted grades over time — an indirect proxy, since true labels are not available in production.                                                               | Label-free (proxy) or audit-sample labels (direct, but sparse).                                                                                                           |
| **Prediction drift**       | The model's output distribution shifts even if inputs look stable.                               | Distribution of P(referable) and per-class probabilities over time, per site.                                                                                                    | Label-free.                                                                                                                                                               |
| **Calibration drift**      | Predicted probabilities stop matching observed frequencies.                                      | Reliability diagram and ECE computed against the audit-sample outcomes (§28.3) — the only drift type that requires _some_ ground truth, which the audit sample exists to supply. | Audit-sample labels.                                                                                                                                                      |
| **Performance drift**      | Actual sensitivity/specificity degrades.                                                         | Audit-sample sensitivity/specificity trend (§28.3), and reviewer-override rate trend (§27.4) as a corroborating signal.                                                          | Audit-sample labels + reviewer decisions.                                                                                                                                 |

_Table 58.1 — Drift taxonomy. Five of seven types are label-free and can be monitored continuously on every case; the two that need ground truth lean entirely on the audit-sampling mechanism from §28.3 — which is why that 5% sample rate is a drift-detection parameter as much as a safety one._

## **58.2 Thresholds and actions**

For each drift type, a two-level response:

LEVEL 1 -- WATCH

trigger: metric moves beyond a defined statistical band for the

first time in a monitoring window

action: surfaced on the engineering dashboard (Sec.51.1); no

automatic system change; an engineer reviews within a

defined SLA

LEVEL 2 -- ACT

trigger: metric remains beyond the band for a SUSTAINED period

(avoids reacting to a single noisy day), OR crosses a

second, more severe threshold immediately

action: varies by drift type --

input/quality/camera drift -> investigate the specific site/device;

may indicate an equipment problem

before it indicates a model problem

class/prediction drift -> compare against Simulink capacity

assumptions (Sec.37.1); may require

re-planning reviewer staffing even

before any model change

calibration drift -> re-fit temperature scaling on recent

audit-sample data (a LIGHTWEIGHT fix,

short of full retraining -- distinguishes

calibration drift from discrimination

drift exactly as Sec.41.1 step 4 does

for the Messidor-2 case)

performance drift -> triggers a retraining evaluation

(Sec.57.5) and, if severe enough,

the rollback procedure (Sec.28.4)

directly

A WATCH does not imply a model problem. An ACT does not automatically

mean retrain -- calibration drift and discrimination drift get

DIFFERENT responses, and confusing them wastes a retraining cycle on

a problem a re-calibration would have fixed in an afternoon.

_Figure 58.1 — Drift response levels. The calibration-vs-discrimination distinction here is the same one §41.1 makes for external validation, applied continuously in production._

## **58.3 Why device-level drift monitoring matters specifically here**

**Rural deployment makes device drift more likely, not less**

A fleet of portable fundus cameras across many sites, operated by non-specialist technicians, in dusty and variable environments, is exactly the population where a single device drifting (a smudged lens, a firmware update changing default exposure) is both likely and easy to miss in an aggregate metric. Per-device stratification (Table 58.1, row 3) is what turns "district-wide sensitivity dipped slightly" into "Site 7's camera needs cleaning" — an actionable, cheap fix instead of an unexplained and alarming aggregate trend.

**PART XI**

# **Roadmap and Scope Management**

# **59\. Development Roadmap**

Eleven phases, Phase 0 through Phase 9 covering everything needed for a validated, demo-ready system, plus Phase 10 for packaging. Every "Phase N" reference elsewhere in this document points to one of these.

## **59.1 Phase overview**

| **Phase** | **Name**                      | **Objective**                                                                                            | **Complexity** |
| --------- | ----------------------------- | -------------------------------------------------------------------------------------------------------- | -------------- |
| 0         | Setup & Verification          | Confirm every TO BE VERIFIED assumption about the toolchain and datasets before building on top of them. | Low            |
| 1         | Data Foundation               | Ingestion, manifesting, splitting, leakage control; the test harness begins here.                        | Medium         |
| 2         | Quality Module                | Image quality assessment MVP, then the weak-supervision upgrade.                                         | Medium         |
| 3         | Baseline Model                | MVP classifier (ResNet-18), pipeline made end-to-end testable.                                           | Medium         |
| 4         | Anatomy & Lesion Modules      | Vessel, disc, fovea, lesion detection; validated against IDRiD.                                          | High           |
| 5         | Full Model & Explainability   | EfficientNet-B0 ordinal head, calibration, three-layer explanation.                                      | High           |
| 6         | Human-in-the-Loop & Reporting | Report generation, escalation rules, reviewer application, reviewer-time study.                          | Medium         |
| 7         | Simulink Capacity Model       | SimEvents model calibrated with measured latencies; scenario suite.                                      | High           |
| 8         | Systems Integration           | District node, database, API, security/privacy hardening, observability.                                 | Medium         |
| 9         | Validation & Freeze           | External validation, ablation study, threshold freezing, full measured metric suite.                     | High           |
| 10        | Demonstration Packaging       | Demo flow, documentation, final quality check, submission packaging.                                     | Low            |

_Table 59.1 — Phase overview. Complexity is relative to this project's scope, not absolute._

## **59.2 Phase detail**

| **Phase** | **Tasks**                                                                                                                                                                                                                                                                                           | **Dependencies**                                                                             | **Deliverables**                                                                                                             | **Definition of done**                                                                                                    | **Key risks**                                                                                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0         | Verify MATLAB toolbox/support-package availability (§16.1); verify SimEvents licence (§36.1); count and inspect dataset files against the assumption register (§1.5); confirm Messidor-2 label provenance (§6.1) without opening the images (rule S1 applies to inspection, not to counting files). | None.                                                                                        | A verification report converting every TO BE VERIFIED tag in Parts I–II to either CONFIRMED or FLAGGED with a fallback plan. | Every A1–A7 assumption and every dataset TO BE VERIFIED note has a resolution.                                            | A missing toolbox or support package discovered late is expensive; this phase exists specifically to front-load that risk.                                                 |
| 1         | Build the ingestion pipeline (§8.1); implement fellow-eye grouping (§8.4); construct train/val/test splits (§8.3); stand up matlab.unittest harness and CI (§55.4); repository scaffolding (§35).                                                                                                   | Phase 0.                                                                                     | Versioned dataset manifest; splitting code with tests; CI pipeline running.                                                  | A dataset_version hash exists and is reproducible from the manifest; CI green on an empty-pipeline smoke test.            | Underestimating fellow-eye leakage risk; committed to reporting residual risk rather than eliminating it (§8.2).                                                           |
| 2         | Deterministic quality features (§9.3); rule-based MVP classifier; synthetic-degradation weak-supervision upgrade (§9.4); retry policy (§9.5).                                                                                                                                                       | Phase 1 (needs the datastore).                                                               | Quality module with unit tests; a labelled robustness test set as a by-product (§9.4).                                       | Grade A/B/C decisions on the fixture set match hand-verified expectations within tolerance (§55.1).                       | Quality/severity confound (§9.6) — mitigated by construction (synthetic degradations), verified by the audit described there.                                              |
| 3         | Preprocessing pipeline (§10); train ResNet-18 @384² ordinal MVP (§16.3); end-to-end wiring so every later module has something real to integrate against.                                                                                                                                           | Phases 1–2.                                                                                  | MVP model artefact; end-to-end smoke-testable pipeline.                                                                      | A fixture image produces a grade, a probability vector, and a (placeholder) report without crashing.                      | Temptation to over-invest in MVP model quality — explicitly not the point of this phase (§16.3).                                                                           |
| 4         | Vessel segmentation (§12); optic disc/fovea localisation (§11); bright and red lesion pipelines (§13); scale normalisation (§12.4); FROC validation against IDRiD.                                                                                                                                  | Phase 1 (IDRiD/DRIVE ingested).                                                              | Anatomy and lesion modules with FROC and Dice metrics reported.                                                              | Vessel Dice and lesion FROC computed and within the ranges discussed in §12.5/§13.3 (or a documented explanation if not). | Resolution mismatch across datasets (§12.4) — the single most likely source of a silent, confusing failure in this phase.                                                  |
| 5         | Train EfficientNet-B0 ordinal head at 512² (§19.3); resolution ablation (§16.4); temperature scaling (§22.2); threshold selection procedure implemented (§21.3); Grad-CAM integration (§24.3); explanation validation battery (§25).                                                                | Phases 3–4.                                                                                  | Production-candidate model artefact; explanation validation report including the randomised-weight control.                  | All six promotion gates (§57.3) evaluated on validation, even if not yet all passing.                                     | Grad-CAM/lesion disagreement debugging (§25.5) can be time-consuming; budget for it explicitly rather than treating it as a bug-fix afterthought.                          |
| 6         | Report templates and language rules (§26); escalation rules E1–E9 (§27.3); Technician and Reviewer app UIs; reviewer-time study (§25.4).                                                                                                                                                            | Phase 5.                                                                                     | End-to-end reviewable case; reviewer-time study results.                                                                     | A reviewer can adjudicate a fixture case through the actual UI in under the target time, at least directionally.          | Recruiting reviewers for the timed study (§25.4) — the substitution to trained raters is pre-approved precisely because ophthalmologist availability is a real constraint. |
| 7         | Build the SimEvents model (§36); calibrate entity attributes from Phase 3–6's measured latencies and quality distributions (§36.2); implement all seven scenarios (§40).                                                                                                                            | Phases 3–6 (needs measured latency/quality data, not assumed values).                        | Executable Simulink model; scenario results for A–G.                                                                         | All seven scenarios run to completion with ≥20 replications each and produce the outputs in Table 40.2.                   | SimEvents licence unavailability (§36.1) — the Stateflow fallback is the mitigation, decided here if needed.                                                               |
| 8         | District database and API (§46, §48); security hardening (§52); privacy review (§53); observability and dashboards (§50, §51); sync protocol (§32.2).                                                                                                                                               | Phase 6 (needs case/report data to move).                                                    | Working district node; end-to-end sync from a test edge instance.                                                            | A case captured on a test edge instance appears correctly in the district reviewer queue after sync.                      | Scope creep toward a full production ops platform — bounded explicitly by §64.                                                                                             |
| 9         | Freeze the model artefact (§41.1 step 1); run internal test once; run Messidor-2 external validation once; run the five-arm ablation (§42); complete the claim register (§43.2); run the full performance benchmark suite (§33.2).                                                                  | Phase 5 (needs a promotable candidate) and Phase 7 (capacity numbers feed the final report). | Complete MEASURED results replacing every placeholder in Parts IV, VII and VIII of this document.                            | Every REQUIRED and TARGET figure in Table 0.1's taxonomy has either a MEASURED value or an honest documented shortfall.   | The temptation to peek at test/Messidor-2 early — guarded against by the discipline established in §8.3/§41.1, not by this phase alone.                                    |
| 10        | Assemble the demo flow (§69); prepare judge-facing materials (§70); run the final quality-check appendix (§74); package the submission.                                                                                                                                                             | Phase 9.                                                                                     | SIH submission package.                                                                                                      | Every item in the §74 checklist is checked.                                                                               | Running out of time to polish — mitigated by treating Phase 10 as packaging only, with no new engineering work introduced this late.                                       |

_Table 59.2 — Phase detail. Dependencies are the load-bearing column: Phase 7 in particular cannot honestly run before Phases 3–6 produce real measured inputs, which is why Simulink work — despite feeling like it could start early — is sequenced where it is._

## **59.3 Critical path**

Phases 0→1→3→5→9 form the critical path for a defensible headline result (a validated model with honest external-validation numbers). Phases 2, 4 and 6 feed Phase 5 and 9 but have some internal parallelism — quality (Phase 2) and anatomy/lesions (Phase 4) do not depend on each other and can proceed concurrently once Phase 1 is done. Phase 7 (Simulink) has a hard dependency on measured data from Phases 3–6, which is the reason it is sequenced late despite being conceptually independent — building it early against assumed, not measured, latencies would produce exactly the "toy simulation with invented numbers" Figure 36.1 explicitly disclaims.

# **60\. MVP Scope**

The MVP is Phases 0–3 plus enough of Phase 6 to produce a viewable result. Its job is to prove the pipeline shape end-to-end, not to hit final performance numbers.

| **In scope**                                       | **Explicitly deferred**                                         |
| -------------------------------------------------- | --------------------------------------------------------------- |
| Quality gate (rule-based, §9.4 option 1)           | Weak-supervision quality upgrade (Phase 2 stretch)              |
| Basic preprocessing (§10.1, model branch only)     | CV-branch enhancement tuning (§10.4 lesion-survival validation) |
| ResNet-18 @384² ordinal classifier (§16.3)         | EfficientNet-B0 @512², resolution ablation                      |
| Threshold selection at a fixed, unvalidated τ      | Bootstrap-CI threshold selection (§21.3)                        |
| Basic Grad-CAM only (Layer 1 of §24.2)             | Lesion evidence layer (Layer 2), full three-layer explanation   |
| A minimal report (grade + confidence + CAM)        | Full structured report with limitations block (§26.1)           |
| Manual review of every case (no triage automation) | P0–P3 triage, escalation rules E1–E9                            |
| Single-machine, offline demo                       | Sync protocol, district node, multi-site operation              |

_Table 60.1 — MVP scope. The right-hand column is not "won't do" — it is "not yet," and every item reappears in V1 or V2 below._

# **61\. V1 Scope**

V1 is Phases 4–8: the system this blueprint actually specifies end-to-end, ready for genuine SIH demonstration and pilot discussion.

- **Full imaging pipeline**: anatomy, vessels, lesion evidence (§11–§13), validated against IDRiD/DRIVE.
- **Full model**: EfficientNet-B0 @512², ordinal head, calibration, validated threshold selection (§16.3, §19.3, §21.3).
- **Full three-layer explanation** with the validation battery run (§24, §25).
- **Complete human-in-the-loop workflow**: escalation rules, triage priority, reviewer app, reviewer-time study (§27).
- **Simulink capacity model** with all seven scenarios, calibrated on measured data (§36–§40).
- **District node**: database, API, sync, basic dashboards, security and privacy baseline (Part IX).
- **External validation on Messidor-2** and the five-arm ablation (§41, §42).
- Explicitly **not** included: DME grading, multi-task learning, ensembling beyond TTA, embedded/mobile deployment, production-grade MLOps automation (retraining pipelines run manually, triggered by the evidence in §57.5, not yet automated end-to-end).

# **62\. V2 Scope**

V2 is where the capabilities this blueprint deliberately declined for V1 — on data-availability or complexity-budget grounds, not because they are uninteresting — become candidates, contingent on evidence from V1.

| **Capability**                                                  | **Why deferred from V1**                                                                              | **What would trigger building it**                                                                                                      |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| DME grading                                                     | No DME labels in APTOS; IDRiD's are limited (§2.3).                                                   | Access to a larger DME-labelled dataset, or a partner with DME-relevant clinical need.                                                  |
| Multi-task shared encoder                                       | Auxiliary labels live on different images than grading labels (§17.2); negative-transfer risk.        | V1's single-task lesion module shows a measurable ceiling that a shared encoder plausibly raises.                                       |
| Multi-model ensembling                                          | Cost/complexity not justified without demonstrated need (§16.5).                                      | TTA alone (already in V1) plateaus and the accuracy gap matters clinically.                                                             |
| Venous beading / IRMA / neovascularisation detection            | Requires vessel-calibre profiling beyond V1's scope; no ground truth available (§13.1).               | Access to annotated data for these findings, or a measured need from V1 error analysis (§44) showing grade-3/4 misses concentrate here. |
| Self-supervised pretraining on the unlabelled APTOS test images | Not necessary to hit V1 targets; the images are already used for label-free monitoring (§6.1).        | V1's labelled-data ceiling is reached and more signal is needed from the same pool.                                                     |
| Automated MLOps retraining pipeline                             | Evidence-based triggers (§57.5) are sufficient at V1's scale; automation adds operational complexity. | Multi-district operation makes manual retraining a genuine bottleneck.                                                                  |
| Embedded/mobile inference (MATLAB Coder → C/C++)                | No embedded hardware requirement identified (§33.4).                                                  | A specific low-power or embedded deployment target is identified.                                                                       |
| Vector-based similarity search for case retrieval               | No product need identified; explicitly excluded from the stack (§49.2).                               | A concrete reviewer workflow need for "find similar prior cases" emerges from field use.                                                |

_Table 62.1 — V2 candidates. Every row is contingent, not committed — consistent with §64's discipline of not building ahead of demonstrated need._

# **63\. Future Research Directions**

Beyond V2, several directions are genuinely open research questions rather than engineering backlog — worth naming so the distinction between "we will build this" and "this would be interesting to study" stays clear.

**Domain generalisation across camera populations.** The external-validation gap between internal test and Messidor-2 (§41) is a measured instance of a broader open problem in medical imaging: how much of a model's apparent skill is camera-specific. Techniques like domain-adversarial training or test-time adaptation are research directions, not yet a specified V2 feature, because their reliability on a task this safety-sensitive is not yet established.

**Foundation-model backbones for fundus imaging.** Large self-supervised retinal foundation models are an active research area. Whether they outperform a task-specific EfficientNet-B0 at this data scale, and whether their explanations are as tractable as Grad-CAM on a known architecture, are open questions this blueprint does not resolve.

**Uncertainty-aware active learning for label-efficient retraining.** Using model uncertainty (§22) to select which cases most need expert re-grading could make the blinded re-grading protocol (§27.4) more label-efficient. Promising, not yet validated for this pipeline.

**Federated evaluation across districts without centralising images.** If this system is deployed across multiple districts or states, evaluating drift and performance without centralising sensitive images is a genuine privacy-engineering research question beyond this document's scope (§53).

**Formal verification of the abstention/escalation logic.** Rules E1–E9 (§22.3, §27.3) are currently specified and tested, not formally verified. For a system with this safety profile, formal methods on the triage decision logic specifically (a bounded, rule-based component, unlike the neural network) is a tractable and worthwhile research direction.

# **64\. Overengineering Control**

Every capability in this blueprint was deliberately classified before being included. This section makes that classification explicit and auditable, because the discipline that kept Kubernetes, message brokers and LLMs out of this design (§29.1, §49.2) only works if it is applied consistently, not just to the obviously fashionable choices.

## **64.1 Classification scheme**

| **Class**                 | **Meaning**                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Required Now**          | Needed for the system to function correctly and safely at all, including the MVP.                                       |
| **Required for SIH Demo** | Not needed for correctness, but needed to demonstrate the problem statement's mandated capabilities credibly to judges. |
| **Required Later**        | Needed for real deployment (V1/V2) but not for a correct, honest demo.                                                  |
| **Optional Advanced**     | Would improve the system but is not required at any stage identified so far.                                            |
| **Research Only**         | Open question; not a committed feature at any stage (§63).                                                              |
| **Not Recommended**       | Considered and explicitly rejected, with the rejection reasoned in this document.                                       |

## **64.2 Classification of major capabilities**

| **Capability**                                                                        | **Class**                                                   | **Where decided**                                                                     |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Quality gate refusing ungradeable images                                              | **Required Now**                                            | §9, §28                                                                               |
| Ordinal cumulative-link head                                                          | **Required Now**                                            | §19.3                                                                                 |
| Human review of every non-auto-cleared case                                           | **Required Now**                                            | §27, §28                                                                              |
| Grad-CAM explanation                                                                  | **Required for SIH Demo**                                   | Mandated by the problem statement (§2.1)                                              |
| Lesion evidence layer                                                                 | **Required for SIH Demo**                                   | Grad-CAM alone cannot meet the explainability requirement honestly (§24.3)            |
| Simulink capacity model with all seven scenarios                                      | **Required for SIH Demo**                                   | Mandated by the problem statement (§2.1); §36–§40                                     |
| Five-arm ablation study                                                               | **Required for SIH Demo**                                   | R-08 (§2.2)                                                                           |
| External validation on Messidor-2                                                     | **Required for SIH Demo**                                   | R-02/R-03 credibility (§41)                                                           |
| Explanation validation battery (localisation, stability, faithfulness, reviewer-time) | **Required for SIH Demo**                                   | The strongest differentiator available (§25, §70)                                     |
| District node (database, API, sync)                                                   | **Required Later** (V1)                                     | §61 — not needed to demonstrate the core AI/XAI/Simulink capabilities on one laptop   |
| Reviewer web application                                                              | **Required Later** (V1)                                     | §61 — MATLAB App Designer suffices for demo review                                    |
| Full security/privacy hardening (Part IX §52–§53)                                     | **Required Later** (V1), baseline **Required for SIH Demo** | A credible design must exist now (this document); full implementation and audit is V1 |
| Automated drift monitoring in production                                              | **Required Later** (V1)                                     | §58 — the _design_ is required now; the _running system_ is not                       |
| DME grading                                                                           | **Optional Advanced / V2**                                  | §62                                                                                   |
| Multi-task shared encoder                                                             | **Optional Advanced / V2**                                  | §62                                                                                   |
| Multi-model ensembling                                                                | **Optional Advanced**                                       | §16.5 — TTA covers most of the benefit cheaply                                        |
| Venous beading / IRMA / NVE detection                                                 | **Research Only**                                           | §13.1, §63 — no ground truth available                                                |
| Sub-pixel microaneurysm "detection" (as commonly claimed)                             | **Not Recommended**                                         | §14 — not physically supportable; reframed instead                                    |
| Kubernetes / microservice decomposition                                               | **Not Recommended**                                         | §29.4, §49.2                                                                          |
| Message broker / event bus                                                            | **Not Recommended**                                         | §49.2 — idempotent sync upsert suffices                                               |
| Vector database / feature store                                                       | **Not Recommended**                                         | §49.2 — no retrieval or online-feature use case exists                                |
| LLM anywhere in the report or triage path                                             | **Not Recommended**                                         | §26.2, §49.2 — hallucination risk in a clinical document is unacceptable              |
| Autonomous diagnosis without human review                                             | **Not Recommended**                                         | §2.3, §28, ADR-14                                                                     |
| Full IEC 62304 / CDSCO regulatory submission                                          | **Not Recommended for this project**                        | §2.3 — designed not to preclude, not attempted                                        |

_Table 64.1 — Full capability classification. This table is the single reference that resolves "should we build X" for any capability named anywhere in this document._

## **64.3 The test applied to every "Required for SIH Demo" item**

**Why the demo-required list is longer than a typical hackathon MVP**

Every item marked "Required for SIH Demo" above is required because it is either explicitly named in the problem statement (Grad-CAM, Simulink) or because omitting it would make a demo-time claim indefensible under the first hard technical question (a lesion evidence layer, because "Grad-CAM is our explainability" does not survive the resolution-ceiling argument in §24.3; external validation, because an internal-only number does not survive "how do you know this generalises"). The bar is not "impressive" — it is "would not collapse under one follow-up question."

**PART XII**

# **Decisions, Risk and Demonstration**

# **65\. Architecture Decision Records**

Fifteen decisions that shaped this blueprint, recorded in the standard ADR form so a reviewer can see not just what was decided but what was considered and rejected. Three are expanded in full; the remaining twelve are tabulated for scanability, with references back to the section where the full reasoning lives.

## **ADR-01 — MATLAB as the core pipeline language**

| **Field**    | **Content**                                                                                                                                                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Context      | The problem statement mandates MATLAB and Simulink. A team could still be tempted to prototype in Python and "port later," or to use MATLAB only as a thin wrapper around Python code.                                                                      |
| Problem      | Which language and toolchain should own the actual image-processing and modelling logic?                                                                                                                                                                    |
| Alternatives | (a) Python/PyTorch/OpenCV core with a MATLAB shim for compliance; (b) MATLAB throughout; (c) a mixed pipeline with a language boundary at some stage.                                                                                                       |
| Decision     | MATLAB throughout — Image Processing, Computer Vision, Deep Learning, and Statistics & ML Toolboxes for the entire pipeline (§34.1).                                                                                                                        |
| Reasoning    | Beyond compliance, the toolbox fit is genuinely strong: fibermetric (Hessian vesselness), built-in gradCAM, and bootci map directly onto real needs (§1.2). A shim architecture would forfeit these and add a language boundary with no offsetting benefit. |
| Trade-offs   | Smaller open-source ecosystem than Python for bleeding-edge architectures (e.g. ViT support is thinner, §16.1); mitigated by the fact that the chosen architecture (EfficientNet-B0) does not need it.                                                      |
| Consequences | MATLAB Compiler + free Runtime becomes the deployment path (ADR-15); toolbox version/support-package verification becomes a Phase 0 gate (§59.2).                                                                                                           |

## **ADR-06 — Threshold selection under a sensitivity constraint**

| **Field**    | **Content**                                                                                                                                                                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Context      | The problem statement requires >90% sensitivity and >85% specificity for referable DR. The default engineering instinct is a 0.5 decision threshold.                                                                                                                                                 |
| Problem      | How should the operating point on the ROC curve be chosen?                                                                                                                                                                                                                                           |
| Alternatives | (a) fixed τ = 0.5; (b) maximise accuracy; (c) maximise Youden's J; (d) select τ under an explicit sensitivity floor.                                                                                                                                                                                 |
| Decision     | Select the largest τ whose sensitivity lower confidence bound still clears 0.90, computed on validation only (§21.3).                                                                                                                                                                                |
| Reasoning    | The clinical costs are asymmetric (§21.2) and the requirement is itself phrased as a constraint, not an average. Using the _lower_ CI bound rather than the point estimate is what makes the resulting threshold likely to hold up on unseen data rather than being a lucky validation-set artifact. |
| Trade-offs   | Specificity is whatever this constraint leaves it to be — potentially below the 85% target (§21.4) — and that shortfall is reported honestly rather than hidden by re-defining the metric.                                                                                                           |
| Consequences | Referral volume becomes a direct, quantifiable function of this threshold, which is exactly the input the Simulink capacity model (§37, §38.2) needs.                                                                                                                                                |

## **ADR-14 — No autonomous diagnosis**

| **Field**    | **Content**                                                                                                                                                                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Context      | A fully autonomous grade-and-refer system would maximise throughput and would be the more "impressive" technical demo.                                                                                                                                                                        |
| Problem      | Should any path exist by which a patient receives a final screening outcome with no human ever reviewing the case?                                                                                                                                                                            |
| Alternatives | (a) fully autonomous for all cases; (b) autonomous for confident cases, human review only for uncertain ones; (c) human review of every non-trivially-cleared case, with only a small audited exception.                                                                                      |
| Decision     | Option (c): every P0/P1/P2 case is reviewed; P3 auto-clear exists but is continuously audited at a 5% sample rate (§28.3), and every failure mode routes to a human by construction (§28.1).                                                                                                  |
| Reasoning    | A false negative in this system risks sight. Deployment population will differ from training population in ways the model cannot self-detect. And a clinical decision needs a clinician accountable for it. All three hold regardless of how good the model's validation metrics look (§3.4). |
| Trade-offs   | Lower throughput ceiling and a standing ophthalmologist-time cost, even a much-reduced one (§3.5) — accepted deliberately as the cost of safety.                                                                                                                                              |
| Consequences | The entire triage, escalation, and audit-sampling architecture (§27, §28) exists because of this decision; it is the single decision with the widest downstream footprint in the document.                                                                                                    |

## **The remaining twelve, tabulated**

| **ADR** | **Decision**                                                                                                            | **Key reasoning**                                                                                                                                                                                          | **Full record at** |
| ------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| ADR-02  | Ordinal cumulative-link head, not a flat 5-way softmax.                                                                 | Encodes severity order in the target structure; makes P(referable) a directly supervised, directly calibrated output rather than a post-hoc sum.                                                           | §19.3              |
| ADR-03  | Strict dataset role separation; no merging APTOS/IDRiD/DRIVE/Messidor-2.                                                | Different grading schemas, cameras, and resolutions make merging a source of label noise and validation contamination, not free data.                                                                      | §7                 |
| ADR-04  | Quality gating as a hard refusal (Grade C blocked), not a soft feature fed to the classifier.                           | A confident grade on an unreadable image is the system's single most dangerous failure mode; refusal converts it into an actionable recapture.                                                             | §9, §28            |
| ADR-05  | Three-layer explanation (CAM + independent lesion evidence + anatomy), not Grad-CAM alone.                              | Grad-CAM's spatial resolution is coarser than a microaneurysm by roughly two orders of magnitude in area; an independent pathway is required for both precision and the layer-agreement safety check (E6). | §24                |
| ADR-07  | EfficientNet-B0 at ≥512² resolution, not a larger backbone at ImageNet-default 224².                                    | Input resolution is the first-order variable for this problem — 224² destroys microaneurysms outright (§10.3); a bigger model on destroyed signal is not a better model.                                   | §16                |
| ADR-08  | SimEvents discrete-event simulation, not a spreadsheet capacity model.                                                  | The service is a queueing network with a rework loop; mean-rate arithmetic (a spreadsheet) cannot surface the non-linear collapse in §36.4, which is the project's central systems finding.                | §36                |
| ADR-09  | All inference at the edge; no cloud dependency in the patient path.                                                     | Same-visit results are non-negotiable given rural connectivity and patient travel burden (§31.1); cloud inference cannot guarantee this.                                                                   | §29, §31           |
| ADR-10  | Two databases — SQLite at the edge, PostgreSQL at the district — not one unified database.                              | The two nodes have almost nothing in common as data-access patterns (single unattended writer vs. concurrent multi-user); a single choice would be wrong for one of them.                                  | §46.1              |
| ADR-11  | Single-process pipeline per node; no microservice decomposition.                                                        | A screening node is one laptop, one user. Decomposition adds IPC and versioning failure modes to buy capability nothing in this deployment needs.                                                          | §29.4, §64         |
| ADR-12  | No LLM anywhere in the report or triage path; template-rendered reports only.                                           | A generated sentence can be fluent and wrong; a clinical report cannot tolerate hallucination risk. Templates cannot hallucinate.                                                                          | §26.2, §49.2       |
| ADR-13  | Sub-pixel microaneurysm "detection" reframed as centroid refinement + stated detection limit, not claimed as detection. | Detecting a signal below the sensor's spatial sampling is not physically possible; the honest, implementable alternative is stronger under scrutiny than the unsupportable claim.                          | §14                |
| ADR-15  | MATLAB Compiler + free MATLAB Runtime for edge deployment, not per-site MATLAB licences.                                | Per-site licensing is not viable at district or multi-district scale; the Compiler/Runtime path is the one that makes rural deployment economically real.                                                  | §33.4              |

_Table 65.1 — ADR-02 through ADR-13/15, condensed. Every decision traces to a section with the full alternatives-and-trade-offs discussion._

# **66\. Cost and Performance Trade-off Scenarios**

The seven Simulink scenarios (§40.1) were designed to answer capacity questions. Read the same seven through a cost and performance lens, they answer a different, equally important question: what does each scenario cost, and where does performance headroom actually matter.

| **Scenario**             | **Capacity finding (§40.1)**                  | **Cost/performance reading**                                                                                                                                                                                                                                                |
| ------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Ideal**            | Comfortable; reference point.                 | Establishes the baseline cost-per-patient (§56.2) against which every other scenario is a delta, not an absolute.                                                                                                                                                           |
| **B — Low bandwidth**    | Tiered upload holds; tier-3 on demand slows.  | Confirms the connectivity cost saving from §31.3's 17× reduction is not just a latency win but the difference between the district's sync budget being feasible or not at the low end of plausible rural bandwidth.                                                         |
| **C — High rejection**   | Non-linear capacity collapse as p_C rises.    | **The highest-value finding for cost engineering.** It says the marginal cost of quality-module quality is non-linear: a modest investment in technician training or camera maintenance likely returns more capacity than a proportional investment in additional stations. |
| **D — High prevalence**  | Reviewer FTE requirement roughly doubles.     | Directly prices the AI's specificity: this is the specificity-to-staffing curve (§38.2) evaluated at a harder operating point, and it is the scenario a high-burden state would care about most.                                                                            |
| **E — Reviewer-limited** | Queue grows unboundedly below a critical FTE. | Identifies the minimum viable ophthalmologist commitment below which the programme is not cost-viable regardless of how good the AI is — a floor, not a target.                                                                                                             |
| **F — AI slowdown**      | Still not the bottleneck.                     | The negative result with the clearest cost implication: it says do not spend budget on GPU hardware or inference optimisation before spending it on cameras, technician training, or reviewer time.                                                                         |
| **G — Full scale**       | Headline annual capacity recommendation.      | The number a funding proposal would actually quote — stations, reviewers, and their annual cost, at the scale the problem statement specifies.                                                                                                                              |

_Table 66.1 — Cost/performance reading of the seven scenarios. No new scenarios are invented here deliberately — re-analysing the same seven under a different lens is more credible than a second, unreconciled scenario set._

# **67\. Project Success Metrics**

Every REQUIRED and TARGET figure named across this document, gathered in one place, each with its verification method and current status. This table is the single artefact a judge or a project lead should check to answer "is this done."

| **Metric**                                           | **Class**                        | **Target**                                                     | **Status**                                       | **Verified at** |
| ---------------------------------------------------- | -------------------------------- | -------------------------------------------------------------- | ------------------------------------------------ | --------------- |
| Referable-DR sensitivity                             | REQUIRED                         | \> 90%                                                         | MEASURED — to be filled Phase 9                  | §21.3           |
| Referable-DR specificity                             | REQUIRED                         | \> 85%                                                         | MEASURED — to be filled Phase 9                  | §21.3           |
| Five-class QWK                                       | Competition metric               | No fixed target; reported against published ranges             | MEASURED — to be filled Phase 9                  | §20.1           |
| Grad-CAM produced for graded cases                   | REQUIRED                         | 100%                                                           | Structural — guaranteed by pipeline construction | §24.3           |
| CAM localisation vs IDRiD masks                      | Derived                          | Materially above the randomised-weight control                 | MEASURED — to be filled Phase 5                  | §25.2           |
| Explanation faithfulness (deletion/insertion AUC)    | Derived                          | Materially better than random-region baseline                  | MEASURED — to be filled Phase 5                  | §25.3           |
| Reviewer time per case (with full explanation)       | REQUIRED (PS target)             | ≤ 30 s median                                                  | MEASURED — to be filled Phase 6                  | §25.4           |
| End-to-end latency, CPU, Standard profile            | TARGET                           | P95 ≤ 8 s                                                      | MEASURED — to be filled Phase 9                  | §33.2           |
| Simulink scenarios executed                          | REQUIRED                         | 7 of 7, ≥20 replications each                                  | MEASURED — to be filled Phase 7                  | §40.3           |
| Ablation arms reported                               | REQUIRED (R-08)                  | 5 of 5, including unflattering results                         | MEASURED — to be filled Phase 9                  | §42.2           |
| External validation performed                        | REQUIRED (R-02/R-03 credibility) | Messidor-2, opened once, frozen threshold                      | MEASURED — to be filled Phase 9                  | §41.1           |
| Internal-to-external performance gap reported        | Derived (honesty requirement)    | Reported regardless of size                                    | MEASURED — to be filled Phase 9                  | §41.1           |
| Calibration (ECE) after temperature scaling          | Derived                          | Materially below pre-scaling ECE                               | MEASURED — to be filled Phase 5                  | §22.2           |
| Vessel segmentation Dice (DRIVE test)                | Derived                          | Approaching the second-observer inter-rater ceiling            | MEASURED — to be filled Phase 4                  | §12.5           |
| Lesion FROC (IDRiD)                                  | Derived                          | Reported at a stated false-positives-per-image operating point | MEASURED — to be filled Phase 4                  | §13.3           |
| District capacity recommendation (100,000+/year)     | REQUIRED (PS scale)              | Stations, reviewer FTE, bottleneck identified                  | MEASURED — to be filled Phase 7                  | §37, §38        |
| Test suite coverage (unit tests per public function) | Internal quality bar             | 100% of +quality, +anatomy, +vessels, +lesions, +triage        | Tracked continuously from Phase 1                | §55.1, §55.3    |
| Audit-sample size for auto-cleared cases             | Design parameter                 | 5% (configurable)                                              | Structural — enforced by construction            | §28.3           |

_Table 67.1 — Success metrics register. Consistent with Table 0.1's taxonomy: every "MEASURED — to be filled" cell is a placeholder for a real number, never a number invented to fill the cell._

# **68\. MVP Acceptance Criteria**

The MVP (§60) is accepted when the following hold — a checklist, not a metric bar, because the MVP's job is to prove pipeline shape, not final performance.

1. A fixture fundus image can be run through the full pipeline — quality → preprocess → classify → explain → report — without any unhandled exception, on a fresh checkout with only the fixture data present.
2. A synthetically degraded (heavily blurred or badly exposed) fixture image is correctly refused (Grade C) rather than silently graded.
3. The classifier produces a five-class grade and a referable/non-referable flag from a single ordinal head — not two separately trained models bolted together.
4. A Grad-CAM overlay is generated and visibly corresponds to a plausible region of the fundus (not the black border, not a corner artefact — the exact bug class Table 44.1 names as a unit-test target).
5. A minimal report renders showing grade, confidence, and the CAM overlay, and rendering the same case twice produces byte-identical output.
6. The full test suite for every module touched (+quality, +preprocess, +classify, +explain, +report) passes in CI.
7. The pipeline runs with no network access at any point (an airplane-mode smoke test), confirming offline operation from the earliest stage rather than discovering a hidden network dependency later.
8. Every dataset property used by the MVP (label counts, split sizes) has been verified against the actual files, not assumed from this document's TO BE VERIFIED placeholders (Phase 0, §59.2).

# **69\. SIH Demonstration Flow**

A demonstration script built around the five defining decisions from the Executive Summary — because the strongest demo is not a feature tour, it is a guided tour of the hardest parts of the problem and how each is handled.

| **Segment**                      | **Duration** | **What is shown**                                                                                                                                               | **What it proves**                                                                     |
| -------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Opening framing                  | ~2 min       | The five coupled sub-problems (Executive Summary) and the one-sentence thesis.                                                                                  | The team understands this is a systems problem, not a classification exercise.         |
| Live capture → quality gate      | ~2 min       | A deliberately poor-quality image refused with specific operator guidance; a good image accepted.                                                               | The quality gate is real and the refusal message is actionable, not generic (§9.2).    |
| Full pipeline on a graded case   | ~3 min       | Grade, calibrated confidence, and the three-layer explanation rendered live, with Layer 1/Layer 2 agreement pointed out explicitly.                             | Explainability is layered and Grad-CAM's limitation is understood, not hidden (§24.3). |
| The honest numbers               | ~3 min       | Internal-test vs Messidor-2 performance side by side, with the gap stated as a headline, not an appendix footnote.                                              | The team reports domain-shift penalty rather than a single flattering number (§41).    |
| Simulink capacity walkthrough    | ~4 min       | Scenario A (ideal) and Scenario C (high rejection) run live or pre-recorded, showing the non-linear collapse (§36.4) and the resulting staffing recommendation. | Simulink is doing real systems-engineering work, not producing a decorative diagram.   |
| The sub-pixel honesty moment     | ~1 min       | A brief, direct statement of what "sub-pixel" does and does not mean here (§14.3), before anyone in the audience has to ask.                                    | Pre-empting the hardest technical question available in the problem statement.         |
| Close: differentiators + roadmap | ~2 min       | The judge-facing differentiators (§70) and a one-slide view of what is measured vs targeted today.                                                              | Sets accurate expectations for what has been validated versus what is designed.        |

_Table 69.1 — Demonstration flow, roughly 17 minutes, sized to a typical SIH presentation-plus-Q&A slot. Segment order is deliberate: quality → explanation → honest numbers → systems insight → the hardest question, addressed before it is asked._

# **70\. Judge-Facing Differentiators**

What a panel that has seen many DR-screening projects this cycle will not have seen elsewhere, gathered from across the document.

| **Differentiator**                                                               | **Why it is rare**                                                                                                                                                                                                                                                         | **Where**    |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| A measured, not asserted, explanation validation battery                         | Almost every DR project shows a Grad-CAM heatmap as its explainability deliverable. Very few measure localisation against a randomised-weight control, stability under perturbation, and faithfulness via deletion/insertion — and fewer still run a timed reviewer study. | §25          |
| Explicit acknowledgement of Grad-CAM's resolution ceiling, with a built solution | Most projects present Grad-CAM as sufficient. This one states the arithmetic showing it structurally cannot localise a microaneurysm, and builds an independent lesion-evidence layer specifically to cover the gap.                                                       | §24.3        |
| The honest external-validation gap as a headline result                          | Reporting only an internal-test number is the default. Reporting the internal-to-external gap explicitly, and separating calibration drift from discrimination drift, is a materially stronger scientific position.                                                        | §41.1        |
| A quantified, non-obvious systems finding (the rework-loop non-linearity)        | The finding that image-quality rejection couples non-linearly to district capture capacity — and that the bottleneck is never the AI — is a genuine systems-engineering insight that only a discrete-event model surfaces.                                                 | §36.4, §33.5 |
| A defensible, non-fabricated answer to the sub-pixel requirement                 | The problem statement invites an overclaim. This design gives the physically honest alternative (centroid refinement + stated detection limit) instead of an unsupportable claim.                                                                                          | §14          |
| The referable-vs-five-class objective distinction, resolved architecturally      | Most projects optimise QWK and assume referable-DR performance follows. The ordinal head makes P(referable) a directly supervised, separately calibrated, separately thresholded output.                                                                                   | §5.2, §19.3  |
| A five-arm ablation that could show the integrated pipeline does NOT help        | The ablation is designed to be falsifiable — arms B1–B5 are reported even if quality gating or lesion evidence turn out not to move the needle, rather than only reporting a flattering final configuration.                                                               | §42          |
| Cost and capacity questions answered with the same model, not separately         | The specificity-to-staffing curve turns an ML metric directly into a staffing decision, closing the loop between Part IV and Part VII rather than treating them as separate deliverables.                                                                                  | §38.2        |
| A device-level, not just aggregate, drift-monitoring design                      | Aggregate metrics hide single-camera degradation. Per-device stratification turns "sensitivity dipped" into "Site 7's lens needs cleaning."                                                                                                                                | §58.3        |
| A rejection log for the "obvious" architecture, not just the chosen one          | Table 1.2 and the ADR alternatives sections document what was considered and rejected, and why — evidence of genuine design deliberation rather than a single default path.                                                                                                | §1.4, §65    |

# **71\. Technical Defense Q&A**

Approximately forty questions a technical panel is likely to ask, organised by domain, each answered in the two or three sentences an oral defence actually allows — with a section pointer for the full argument.

## **71.1 Architecture**

**Why not microservices — isn't that the modern standard?** A screening node is one laptop with one user; a district node serves a handful of reviewers. Neither is a distributed-systems problem, and decomposition would add failure modes without adding capability. §29.4, §64.

**Why two different databases instead of one?** The edge and district have almost nothing in common as access patterns — single unattended writer versus concurrent multi-user with role-based access. SQLite and PostgreSQL are each the right tool for their half. §46.1.

**What happens if the district server goes down?** Edge sites are unaffected — they queue locally and continue serving patients offline by design, not by accident. §32, §54.1.

**Why is Simulink never in the request path?** A discrete-event simulation of a queue has no business executing while a patient waits; its outputs are planning artefacts consumed ahead of time, not live decisions. §29.2.

**How does the system avoid vendor lock-in to MATLAB at the district level?** It doesn't need to avoid it there, because MATLAB never runs inline with a district API request — only in offline batch re-processing jobs. The district API and reviewer app use standard, swappable web technology. §48.3.

## **71.2 AI/ML**

**Why an ordinal head instead of standard 5-way softmax?** DR severity is ordered; a flat softmax treats a grade-0-vs-4 error the same as a grade-1-vs-2 error. The ordinal head also makes referable DR a directly supervised output rather than a post-hoc probability sum. §19.3.

**Why EfficientNet-B0 and not a larger, more powerful backbone?** At this data scale (~3,662 labelled images), resolution matters more than backbone capacity — a bigger model on 224² input is a bigger model on already-destroyed signal. Resolution was prioritised within a fixed compute budget. §16, §10.3.

**How do you know the model isn't just memorising APTOS?** Group-aware splitting reduces fellow-eye leakage, and external validation on Messidor-2 — a dataset never touched until the final freeze — is the direct test. The residual leakage risk is reported, not claimed away. §8.2, §41.

**Why not use an ensemble for better accuracy?** Ensembling multiplies inference cost and complicates explanation attribution. Test-time augmentation captures most of the benefit far more cheaply and is used instead; a full ensemble is adopted only if it clears the bootstrap-CI noise margin. §16.5.

**How was the classification threshold chosen — why not 0.5?** Costs are asymmetric and the requirement is a constraint, not an average. The threshold is the largest value whose lower confidence bound on sensitivity still clears 90%, chosen on validation and frozen before touching test data. §21.3.

## **71.3 Computer Vision**

**Why is vessel segmentation needed at all if the goal is DR grading?** It suppresses the dominant false-positive class for microaneurysm detection (vessel cross-sections), gives the most flare-robust optic disc localisation cue, and is the best available proxy for image gradeability. §12.1.

**How do you handle the huge resolution difference between DRIVE and APTOS/IDRiD?** By normalising to a consistent vessel width in pixels, derived from measured pixels-per-degree, rather than matching image size — image-size matching would look for structures roughly 7.6× the wrong scale. §12.4.

**Why extract the green channel instead of using full colour throughout?** Haemoglobin absorbs green strongly, giving the best contrast for vessels and red lesions; the bright-lesion (exudate) branch keeps colour specifically because hard/soft exudate discrimination depends on it. §10.2.

**What stops CLAHE from destroying the microaneurysms it's meant to help reveal?** The clip limit is chosen by a lesion-preservation validation experiment against IDRiD masks — measuring contrast change and lesion survival rate directly, not by looking at pictures. §10.4.

**Why is enhancement excluded from the model branch by default?** CNNs learn their own contrast normalisation; adding CLAHE injects a non-linearity that must then be reproduced exactly at inference, and empirically often does not help. Whether it helps is an ablation, not an assumption. §10.5.

## **71.4 Clinical**

**Why is the referral boundary between grade 1 and grade 2 given so much extra attention?** It is the only boundary with real clinical cost — the 0|1 and 2|3|4 boundaries all fall on the same side of the referral decision. Engineering effort follows clinical consequence, not just QWK. §5.3.

**What happens to a patient whose eye simply cannot be photographed well (e.g. dense cataract)?** After the retry budget is exhausted, the case routes to a human reviewer with the original image and the reason for failure — "cannot be photographed" is itself clinically informative and is never discarded. §9.5.

**Does the system diagnose diabetic macular oedema?** No — APTOS carries no DME labels, so DME is explicitly out of MVP/V1 scope rather than silently unsupported. It is a stated V2 candidate contingent on suitable data. §2.3, §62.

**How does the system handle the fact that DR itself can obscure the image (vitreous haemorrhage)?** This exact quality/severity confound is named directly, mitigated by training the quality model on synthetic (disease-independent) degradations, and backstopped by routing every ungradeable case to a human rather than discarding it. §9.6.

**Is this a diagnostic device?** No — it is a screening and triage aid. Every report states this explicitly, every referral passes through a human reviewer, and the document's claim register states plainly what is and is not claimed. §3.2, §43.2.

## **71.5 Explainability**

**Isn't Grad-CAM enough — why build a whole second explanation layer?** A single Grad-CAM cell at typical input resolution spans an area roughly 250× larger than a microaneurysm; it can point at a region, not a lesion. The independent lesion-evidence layer supplies the precision Grad-CAM structurally cannot. §24.3.

**How do you know the explanation is actually correct and not just plausible-looking?** A randomised-weight control model is run through the same localisation protocol; if it scores nearly as well as the trained model, the explanation is reading image structure, not learned pathology. This project runs that control. §25.2.

**How do you know the explanation actually helps a reviewer, rather than just looking good in a demo?** A timed reviewer study compares image-only, image-plus-grade, and image-plus-full-explanation arms, measuring both speed and — critically — whether agreement with the reference grade improves or whether reviewers are just deferring to the AI. §25.4.

**What is automation bias and how does this design guard against it?** It is the risk that a reviewer starts agreeing with the AI rather than independently evaluating the case. The reviewer study explicitly checks agreement-with-AI against agreement-with-reference-grade to detect this, and would report it as a safety finding if found. §25.4.

**Why exclude guided backpropagation, which produces much sharper-looking maps?** Published sanity checks show guided backprop produces similar-looking maps even with randomised model weights — meaning it substantially reflects input edges, not learned features. A compelling explanation that does not depend on the model is the wrong artefact for a clinical setting. §24.4.

## **71.6 Simulink and Systems**

**Why SimEvents rather than plain Simulink or a spreadsheet?** The service is a queueing network with entities, probabilistic routing, and a rework loop; SimEvents represents individual cases waiting in queues, which mean-rate arithmetic cannot. §36.1.

**Where do the simulation's input parameters come from — are they invented?** Three of the six core entity attributes are measured directly from the team's own pipeline instrumentation (capture quality distribution, AI service time, referral rate from measured sensitivity/specificity); the rest are declared assumptions with stated ranges. §36.2.

**What is the single most important finding from the capacity model?** That recapture demand compounds multiplicatively with the quality-rejection rate, producing non-linear queue collapse near saturation — and that the AI is never the throughput bottleneck; capture and review capacity are. §36.4, §33.5.

**How many ophthalmologists does this design actually need for 100,000 patients/year?** The analytic pre-check suggests on the order of one part-time reviewer under a safety-first review-everything policy, refined by the full seven-scenario simulation with confidence bands rather than a single point estimate. §37.2.

**What if the specificity target of 85% isn't hit?** The specificity-to-staffing curve converts any shortfall directly into a reviewer-hour cost, giving a quantified consequence rather than an apology — and identifying the ablation most likely to close the gap. §38.2.

## **71.7 Deployment**

**Why not just run inference in the cloud and simplify the edge?** Rural connectivity is intermittent and patients will not return for a second visit; a same-visit result is non-negotiable, which cloud inference cannot guarantee. §31.1, §29.4.

**How does a rural site run MATLAB without a licence?** MATLAB Compiler produces a standalone executable paired with the MATLAB Runtime, which is free to redistribute — no per-site licence is needed. §33.4.

**What happens during a multi-day network outage?** Normal operation continues locally; urgent (P1) cases have an explicit out-of-band path (printed referral letter, phone call) that never depends on the network at all. §32.1.

**How much bandwidth does this actually need?** A tiered upload strategy — metadata for every case, review-resolution images only for the ~25% needing review, full resolution only on demand — cuts daily upload volume roughly 17× versus naive full-resolution upload. §31.3.

**What stops a case from being lost or duplicated during sync?** Each case carries a client-generated UUID used as an idempotency key; retries are safe by construction, and a daily reconciliation report catches any discrepancy between local and district-acknowledged counts. §32.2, §32.3.

## **71.8 Security**

**How is patient data protected if a screening laptop is lost or stolen?** Full-disk encryption plus application-level encryption of the image directory; the technician app additionally exposes no browsable gallery, only the current patient. §52.1.

**Are images stored with patient names attached?** No — the pipeline uses pseudonymous identifiers throughout; identity resolution is owned by the facility's existing registration system, not by this pipeline's data path. §53.1.

**How do you know the model being run hasn't been tampered with?** Every model artefact is content-addressed and hash-verified at load; a mismatch blocks inference and falls back to the last verified version rather than running an unverified artefact. §28.4, §52.1.

**Can a reviewer see another reviewer's cases?** No — role-based access is enforced at the database layer via row-level security, not only in application code, so an application bug cannot silently leak cross-reviewer data. §46.3, §52.2.

**Is the audit log tamper-proof?** It is append-only at the database grant level — the application role has no UPDATE or DELETE grant on it — with periodic export to write-once storage for defence in depth. §52.1.

# **72\. Technical Risk Register**

Every material risk named across this document, gathered into one register with probability, impact, detection method, mitigation, and an owning role — the working document a project lead would actually maintain.

| **Risk**                                                                                              | **Probability**           | **Impact**                                                            | **Detection**                                                                             | **Mitigation**                                                                                                                                    | **Owner**         |
| ----------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Fellow-eye leakage across APTOS splits inflates internal metrics.                                     | High                      | Medium — internal numbers optimistic; external validation catches it. | Dedupe-group audit (§8.4); gap between internal and external performance (§41).           | Group-aware splitting; residual risk reported explicitly, never hidden.                                                                           | ML lead           |
| Messidor-2 label scheme mismatch produces a meaningless external number.                              | Medium                    | High — the headline external-validation claim would be invalid.       | Label provenance verification before Phase 9 (§6.1).                                      | Verify and document the exact label mapping before any evaluation; report the mapping alongside the result.                                       | Data lead         |
| Quality module learns the quality/severity confound (rejects sick eyes as "ungradeable").             | Medium                    | Critical — false reassurance path.                                    | Rejection-rate-by-true-grade audit (§9.6).                                                | Synthetic-degradation training decorrelates degradation from disease; ungradeable cases still route to a human.                                   | CV lead           |
| Referable-DR sensitivity/specificity targets not jointly achievable.                                  | Medium                    | High — a REQUIRED target missed.                                      | Threshold-sweep ROC curve (§21.3).                                                        | Report the achievable frontier honestly; quantify the referral-load consequence via Simulink; identify the ablation most likely to close the gap. | ML lead           |
| Grad-CAM/lesion-layer disagreement undermines reviewer trust.                                         | Medium                    | Medium                                                                | Explanation validation battery, especially the randomised-weight control (§25.2).         | Layer-agreement is treated as a designed signal (E6), not hidden; disagreement cases are the priority class for error analysis.                   | XAI lead          |
| Recapture rate rises in the field beyond modelled ranges, collapsing capacity.                        | Medium                    | High — the non-linear failure mode from §36.4, realised.              | Site-level recapture-rate monitoring against baseline (§50.3).                            | Early alerting well before saturation; investigate as an equipment/training issue first.                                                          | Programme manager |
| SimEvents licence unavailable, threatening the Simulink deliverable.                                  | Low                       | High — a REQUIRED capability at risk.                                 | Verified in Phase 0 (§36.1, §59.2).                                                       | Stateflow + MATLAB Function fallback, decided early enough to not threaten the timeline.                                                          | Simulink lead     |
| Small dataset (~3,662 images) causes high seed-to-seed variance, making model comparisons unreliable. | High                      | Medium — could lead to false conclusions in ablation/model-selection. | Multi-seed variance tracking (§43.3).                                                     | ≥3 seeds per comparison as standard practice; differences within the noise band are not reported as findings.                                     | ML lead           |
| Preprocessing/model version mismatch served in production.                                            | Low                       | Critical — silent accuracy collapse.                                  | Runtime hash assertion at load (§28.4).                                                   | Preprocessing hash bundled into the immutable model artefact; mismatch blocks inference.                                                          | Engineering lead  |
| Reviewer recruitment for the timed study is infeasible (no ophthalmologist available).                | Medium                    | Medium — R-05 evidence weakened.                                      | Identified at study design time (§25.4).                                                  | Pre-approved substitution to trained final-year optometry/medical raters, disclosed openly in any reporting.                                      | Clinical liaison  |
| Automation bias: reviewers defer to the AI rather than independently evaluating.                      | Medium                    | High — undermines the entire human-in-the-loop safety argument.       | Agreement-with-AI vs agreement-with-reference-grade comparison across study arms (§25.4). | Explicitly tested for and would be reported as a safety finding, not suppressed.                                                                  | Clinical liaison  |
| Confirmation loop: reviewer-approved AI grades used naively as retraining labels.                     | Medium                    | High — model degrades while appearing to improve.                     | Retraining-data provenance check.                                                         | Only independently, blindly re-graded cases are ever used as training labels (§27.4).                                                             | ML lead           |
| Edge disk fills during a multi-day outage or busy camp.                                               | Medium                    | Medium — capture blocked if unmitigated.                              | Free-space monitoring with early alerting (§50.3, §54.1).                                 | Warn well before zero; derived artefacts are pruned first, originals only after sync acknowledgement.                                             | Engineering lead  |
| Scope creep toward a full production ops platform during Phase 8.                                     | Medium                    | Medium — timeline risk, not correctness risk.                         | Reviewed against the §64 capability classification.                                       | District-node scope bounded explicitly to what Table 64.1 marks Required Later, not Optional Advanced.                                            | Project lead      |
| Over-claiming sub-pixel detection under problem-statement pressure.                                   | Low (mitigated by design) | High — credibility risk if claimed and challenged.                    | N/A — pre-empted by design.                                                               | Reframed at the architecture level (§14), not left as a documentation-only caveat.                                                                | Project lead      |
| Device-level quality drift (dirty lens, miscalibration) misread as a model problem.                   | Medium                    | Medium — wastes a retraining cycle on the wrong fix.                  | Per-device stratified monitoring (§58.1, §58.3).                                          | Device axis is a standing stratification in both error analysis (§44.1) and production drift monitoring.                                          | Engineering lead  |

_Table 72.1 — Technical risk register, sixteen entries. Every "High" probability or impact risk has a mitigation that is architectural (built into the design) rather than purely procedural (a promise to be careful)._

# **73\. Final Technical Recommendation**

What this blueprint recommends building, and in what order, stated plainly for a reader who has reached the end of the document.

Build the MVP (§60) first and get the pipeline shape end-to-end within days, not the final model. Move immediately to Phase 4's anatomy and lesion modules in parallel with Phase 2's quality upgrade — neither depends on the other, and both feed the explanation layer that is this project's strongest differentiator. Do not begin the Simulink model until Phases 3–6 have produced real measured latencies and quality distributions; a capacity model built on assumed numbers is worse than no capacity model, because it looks authoritative while being fiction.

Spend disproportionate effort on three things that most comparable projects skip entirely: the explanation validation battery (§25), the honest external-validation report on Messidor-2 (§41), and the five-arm ablation that is allowed to show the integrated pipeline does not help (§42). These three are individually inexpensive — days, not weeks — and collectively they are what separates a system that has been _evaluated_ from one that has merely been _built_.

**The recommendation in one paragraph**

Build the safety-critical path first (quality gate → human review, never the reverse), measure before simulating, validate externally before claiming generalisation, and report every unflattering result with the same confidence as every flattering one. Every one of those four habits costs less than it appears to and buys more credibility than any single accuracy number could.

# **74\. Final Quality-Check Appendix**

A checklist against which this document — and the system it specifies — can be audited before submission. Organised by the concern each item protects.

## **74.1 Claim discipline**

- Every REQUIRED/TARGET/ASSUMPTION/MEASURED/PUBLISHED/TO BE VERIFIED tag is used consistently with Table 0.1's definitions.
- No MEASURED figure appears anywhere without having actually been computed — placeholders say so explicitly rather than being filled with a plausible-looking invented number.
- No claim of "detection" is made for a lesion class this design cannot actually support (§13.1, §14).
- No use of "diagnosis," "normal," or unqualified negative findings in any report template (§26.2).
- The claim register (§43.2) is checked against every results section before submission — nothing claimed there that is not supportable.

## **74.2 Data integrity**

- Messidor-2 has not been opened, inspected, or tuned against before the Phase 9 freeze (rule S1).
- Dataset role-separation rules S1–S7 (§7.1) are followed in the actual code, not only in this document.
- Fellow-eye grouping has been run and its residual-risk statement is included in any results reporting (§8.4).
- Normalisation statistics and quality thresholds are computed on the training split only (§8.1 rule L3).
- The threshold τ\* and temperature are fitted on validation only, never on test (§21.3, §22.2).

## **74.3 Safety architecture**

- Every pipeline stage failure routes to P0, never to a silent default grade (§27.1, rule E9).
- The auto-clear (P3) path carries the mandatory 5% audit sample, enforced structurally (§28.3).
- Escalation rules E1–E9 are implemented and unit-tested individually, not only described (§27.3, §55.1).
- Rollback to the previous model version is verified to work as a configuration change, not a redeployment (§28.4).
- No path exists by which a patient receives an outcome with zero human involvement and zero audit sampling.

## **74.4 Explainability rigour**

- The randomised-weight control has actually been run, not just described as a good idea (§25.2).
- CAM energy outside the field-of-view mask is asserted to be zero by a unit test (§55.1) — the exact bug class named in error analysis.
- The reviewer-time study, or its substitution-disclosed variant, has been run before any claim about the 30-second target is made (§25.4).
- Faithfulness (deletion/insertion) curves are reported against a random-region baseline, not in isolation (§25.3).

## **74.5 Systems and Simulink**

- All seven scenarios (§40.1) are executed and reported, including Scenario F's negative result.
- Simulink entity attributes are sourced from measured pipeline data wherever Table 36.1/Figure 36.2 says they should be — not left as assumed defaults past Phase 7.
- Each scenario run uses ≥20 replications and reports variance, not a single-run point estimate (§40.3).
- The specificity-to-staffing curve (§38.2) is produced from actual measured sensitivity/specificity, not the illustrative shape in Figure 38.1.

## **74.6 Reproducibility and governance**

- Every model artefact bundles weights, preprocessing hash, temperature, and τ\* as one immutable, content-addressed unit (§45.3, §57.1).
- A fixed case, same model_version, produces a byte-identical report on repeated runs (§26.3, §68).
- The dataset version, preprocessing version, and git commit are recorded for every training run (§57.2).
- The audit log is genuinely append-only at the database grant level, verified, not merely intended (§52.1).

## **74.7 Scope discipline**

- Every capability built maps to a class in Table 64.1; nothing has been built that the table would mark Not Recommended.
- DME grading, multi-task learning, ensembling beyond TTA, and other V2 items are absent from the MVP/V1 codebase, consistent with §61's explicit exclusions.
- No Kubernetes, message broker, vector database, feature store, or LLM appears anywhere in the implementation (§49.2).

# **75\. Requirements Traceability Appendix**

Every requirement from Table 2.1, mapped to where it is implemented, where it is tested, and where it is reported — closing the loop from requirement to evidence.

| **ID** | **Requirement**                           | **Implemented at**                             | **Tested at**                                        | **Reported at**                              |
| ------ | ----------------------------------------- | ---------------------------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| R-01   | ICDR grades 0–4 classification.           | §19.3 (ordinal head)                           | §55.1 (model layer)                                  | §67 (QWK, confusion matrix)                  |
| R-02   | Referable-DR sensitivity > 90%.           | §19.3, §21.3                                   | §55.1 (performance layer); §57.3 (promotion gate)    | §41 (internal + external), §67               |
| R-03   | Referable-DR specificity > 85%.           | §21.3                                          | Same as R-02                                         | §41, §67; frontier reported if unmet (§21.3) |
| R-04   | Grad-CAM produced and explainable.        | §24.3 (generation); §13 (lesion layer)         | §55.1 (XAI layer)                                    | §25.2/§25.3 (localisation, stability)        |
| R-05   | Clinically useful evidence.               | §24 (three-layer explanation)                  | §25.4 (reviewer-time study)                          | §67; §70 (differentiator)                    |
| R-06   | Simulink workflow + resource modelling.   | §36 (model), §40 (scenarios)                   | §40.3 (replication discipline)                       | §37, §38, §66, §67                           |
| R-07   | Validation against published benchmarks.  | §42.3                                          | N/A (comparative, not a gate)                        | §42.3, §43                                   |
| R-08   | Integrated-pipeline performance analysis. | §42.1 (five-arm ablation design)               | §55.1 (regression layer)                             | §42.2, §67                                   |
| R-09   | Ungradeable images refused, not graded.   | §9.2, §9.5                                     | §55.1 (image-processing layer); §68 (MVP acceptance) | §67 (rejection rate)                         |
| R-10   | Low-confidence predictions abstain.       | §22.3 (rules E1–E6)                            | §55.1; §55.4 (failure-injection)                     | §67 (abstention rate)                        |
| R-11   | Calibrated probabilities.                 | §22.2 (temperature scaling)                    | §57.3 (calibration gate)                             | §67 (ECE)                                    |
| R-12   | Offline single-machine operation.         | §29, §32                                       | §68 (airplane-mode smoke test)                       | §68                                          |
| R-13   | Auditability to model + dataset version.  | §45.1 (immutable artefacts), §52.1 (audit log) | §55.1 (integration layer)                            | §74.6                                        |

_Table 75.1 — Requirements traceability. Every row has a non-empty implementation, test, and reporting column — a requirement with a gap in any column is not yet actually satisfied, whatever this document might claim elsewhere._

_This blueprint is a design specification. Every MEASURED placeholder in this document is a commitment to fill it with a real number, or to report honestly why it could not be filled — never to leave it quietly unresolved._