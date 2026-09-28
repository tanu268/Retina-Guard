# T-806.1 DATASET VERIFICATION REPORT

## 1. Executive Result
**NOT SUITABLE (EXTERNAL) / INTERNAL REQUIRED**
Primary-source verification confirms that while M-FIQ and EyeQ provide legitimate quality labels, their licenses and dataset characteristics (academic-only usage restrictions for EyePACS/Synapse, and lack of explicit degradation labels in EyeQ) present significant legal and technical blockers. The most defensible path forward to satisfy G15 for the RetinaGuard MVP is the **Internal Annotation Protocol (500-image subset)**.

## 2. Primary-Source Verification Matrix

| Claim | Candidate | Primary Source | Verified | Evidence |
|------|-----------|----------------|----------|----------|
| 28,792 images, Good/Usable/Reject | EyeQ | MICCAI 2019 (Huazhu Fu et al.) | YES | [arXiv:1907.05345], [HzFu/EyeQ GitHub] |
| Explicit Degradation Labels | EyeQ | GitHub / Paper | NO | The dataset provides only final A/B/C grades. Degradations are synthesized in research, not explicitly labelled. |
| 7,971 images, Good/Usable/Reject | M-FIQ | MELBA 2026 ("M-FIQ: Mobile Fundus...") | YES | Synapse: syn75868226, MELBA publication |
| Explicit Degradation Labels | M-FIQ | MELBA 2026 | YES | Includes labels for low sharpness, underexposure, overexposure, incomplete FOV, peripheral shadowing. |
| 2,246 images, MOS 0-100 | FIQS | Figshare | YES | Figshare Dataset ID: 28129847 |
| Explicit Degradation Labels | FIQS | Figshare | NO | Focus is on continuous scoring, not multi-label degradations. |

## 3. M-FIQ Verification
- **Labels:** M-FIQ provides image-level multi-label annotations (blur, illumination, field of view, exposure, shadowing) alongside categorical Good/Usable/Reject grades.
- **Mapping:** These labels map **directly** to 5 out of 10 RetinaGuard quality requirements (Blur, Illumination, Exposure, Field Coverage, Artifact).

## 4. EyeQ Verification
- **Labels:** Good, Usable, Reject.
- **Grading:** Overall quality classification re-annotated from EyePACS by experts.
- **Rejection Reasons:** MISSING. The dataset supports only absolute gradeability, not degradation-specific quality classification.

## 5. FIQS Verification
- **Labels:** Continuous Mean Opinion Scores (MOS 0-100) by 6 ophthalmologists, plus categorical labels.
- **Rejection Reasons:** MISSING. It supports relative quality scoring and absolute gradeability, but no specific feature degradation checks.

## 6. License / Usage (HARD GATE)
- **EyeQ:** Derived from Kaggle EyePACS. The EyePACS dataset license strictly prohibits commercial use and restricts redistribution. **LEGAL REVIEW REQUIRED.**
- **M-FIQ:** Hosted on Synapse, which typically imposes restrictive data use agreements (academic/research only). **LEGAL REVIEW REQUIRED.**
- **FIQS:** Hosted on Figshare (often CC-BY), but provenance is unclear. **LEGAL REVIEW REQUIRED.**
*Conclusion: None of the external datasets are currently cleared for commercial/demo inclusion without explicit legal approval.*

## 7. Data Leakage Analysis
- **EyeQ:** Sourced from EyePACS (US demographics, multiple cameras). Does not overlap with APTOS (Aravind Eye Hospital, India) or IDRiD (Nanded, India).
- **M-FIQ:** Sourced from Eyer2 portable cameras. Does not overlap with APTOS/IDRiD (desktop cameras).
- **FIQS:** Source unknown, likely independent.
- **Hash Duplication Audit:** **NOT VERIFIED**. Actual images were not downloaded due to unestablished usage rights, so SHA-256 duplicate checks against local APTOS fixtures could not be run.

## 8. Requirement Coverage

| Requirement | M-FIQ | EyeQ | FIQS |
|-------------|-------|------|------|
| Field Coverage | DIRECT | MISSING | MISSING |
| Focus / Blur | DIRECT | MISSING | MISSING |
| Fine Structure | PROXY | MISSING | MISSING |
| Illumination | DIRECT | MISSING | MISSING |
| Exposure | DIRECT | MISSING | MISSING |
| Contrast | PROXY | MISSING | MISSING |
| Colour Balance | MISSING | MISSING | MISSING |
| Landmark Vis. | PROXY | MISSING | MISSING |
| Artifact Burden | DIRECT | MISSING | MISSING |
| Decodability | MISSING | MISSING | MISSING |

## 9. Internal Annotation Alternative (500 Images)
To proceed without legal blockers and satisfy the exact blueprint requirements, the project must adopt the internal annotation route:
1. **Annotator Expertise:** Minimum 2 clinical ophthalmologists or certified ophthalmic technicians.
2. **Annotation Categories:** A/B/C overall grade PLUS binary flags for the 10 specific RetinaGuard degradations (blur, FOV, etc.).
3. **Independence:** Images must be sampled exclusively from the APTOS training split to prevent test-set leakage.
4. **Adjudication:** A third senior clinician adjudicates disagreements.
5. **Quality Control:** Blind re-grading of 10% of samples to establish intra-rater reliability.
6. **Known-Good Subset:** Images unanimously graded 'A' with no degradation flags form the "known-good" baseline for the weak-supervision V1 synthesis path.

## 10. Acquisition Decision
- **M-FIQ:** CONDITIONAL (Requires Legal clearance for Synapse terms).
- **EyeQ:** NOT SUITABLE (Lacks degradation labels; restricted EyePACS license).
- **FIQS:** NOT SUITABLE (Lacks degradation labels).

## 11. G15 Readiness
**BLOCKED**

## 12. Remaining Gaps
1. **Legal Clearance:** External data cannot be downloaded until legal approves the licenses.
2. **Clinical Annotation:** The internal annotation protocol has not yet been executed. We do not have the 500 labeled images required to begin ML development.

## 13. Exact Sources
- EyeQ: [https://github.com/HzFu/EyeQ], [arXiv:1907.05345]
- M-FIQ: [MELBA Journal 2026], Synapse ID syn75868226
- FIQS: Figshare ID 28129847
