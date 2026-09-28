# T-806.2 CLINICAL IMAGE-QUALITY ANNOTATION PROTOCOL

## 1. Overall Grade Definitions
Each image must receive a single, independent overall grade before component dimensions are analyzed:
- **A (ACCEPTABLE):** The image is of high quality; all major retinal structures are clearly visible. Fully gradeable.
- **B (USABLE):** The image has visible degradations (e.g., mild haze, partial shadowing) but remains sufficient for a reliable clinical DR diagnosis. Usable with limitations.
- **C (REJECT):** The image is fundamentally ungradeable due to severe degradations. A reliable clinical diagnosis is impossible.
- **UNCERTAIN:** The annotator cannot confidently determine if the image crosses the threshold between states (e.g., between Usable and Reject).

## 2. Quality Dimension Definitions (PASS / FAIL / UNCERTAIN)
Annotators evaluate 10 explicit dimensions. Each must be explicitly marked PASS, FAIL, or UNCERTAIN.

### Field Coverage
- **PASS:** Retina fills the expected field of view; no major off-center cropping.
- **FAIL:** Extreme off-center capture where >30% of the relevant macular/disc region is cut off.
- **UNCERTAIN:** Borderline cropping that might hide peripheral lesions.
- **Decision Rule:** Fail only if the missing field objectively prevents full DR screening.

### Focus / Blur
- **PASS:** Retinal structures and vessel margins are sufficiently resolved.
- **FAIL:** Severe defocus blur or motion blur prevents reliable clinical interpretation of lesions.
- **UNCERTAIN:** Mild blur where major vessels are seen but microaneurysms might be obscured.
- **Decision Rule:** If fine vessels (2nd/3rd order) cannot be traced in the macula, fail.

*(Other dimensions follow the exact same structural rule: Illumination Uniformity, Exposure, Contrast, Colour Balance, Landmark Visibility, Artifact Burden, Fine Structure, Decodability).*

## 3. Degradation & Rejection Reasons
Any image graded **B** or **C** MUST have at least one explicit reason selected from the `rejection_reasons` predefined schema list (e.g., `severe_blur`, `insufficient_fov`, `low_contrast_haze`). These represent predefined degradation/rejection reasons contributing to a B or C assignment.

## 4. Handling of UNCERTAIN
- **Overall Grade = UNCERTAIN:** This counts as a disagreement if the other annotator provides A, B, or C. It requires ADJUDICATION.
- **Dimension = UNCERTAIN:** This counts as a disagreement if the other annotator provides PASS or FAIL. It requires ADJUDICATION.
- **Known-Good Subset Eligibility:** An image containing ANY `UNCERTAIN` annotation (overall grade or any dimension) **cannot** qualify for the known-good subset.

## 5. Clinical Annotators & Blinding
- **Personnel:** 
  - Annotator 1: Certified Ophthalmic Technician or Ophthalmologist (`PRIMARY_1`).
  - Annotator 2: Certified Ophthalmic Technician or Ophthalmologist (`PRIMARY_2`).
  - Adjudicator: Senior Ophthalmologist (`ADJUDICATED`).
- **Blinding Requirements:** Annotators will evaluate raw images ONLY. They will be strictly blinded to the patient's actual DR diagnosis, any model predictions, and the other annotator's decisions.

## 6. Independent Annotation & Agreement Analysis
1. Annotators 1 and 2 independently grade the 500-image cohort.
2. **Agreement Analysis:** Raw agreement percentage is reported for all overall grades and dimensions. Where applicable, Cohen's kappa (κ) is reported.
3. **Internal QC Trigger:** If $\kappa < 0.6$, this triggers an internal protocol/annotation review. This threshold is an operational QC rule for this project, not a universal scientific validity criterion.

## 7. Adjudication
For any image where Annotator 1 and 2 disagree on the Overall Grade (A/B/C/UNCERTAIN) or ANY dimension (PASS/FAIL/UNCERTAIN):
- The Adjudicator reviews the image independently.
- The Adjudicator reviews both primary grades.
- The Adjudicator issues the final `ADJUDICATED` ground truth grade and records an explicit `adjudication_reason`.
- Original annotations are NEVER overwritten.

## 8. Quality Control: 10% Re-grade Calculation
- 50 images (~10% of the cohort) will be randomly duplicated and presented to Annotator 1 and Annotator 2 a second time (`RE_GRADE`), blinded, at least 48 hours after their first pass.
- **Calculation of Intra-Rater Disagreement:** Disagreement occurs if the original overall grade (A/B/C/UNCERTAIN) differs from the re-grade overall grade. 
- **Trigger:** If the disagreement rate > 10% (i.e., > 5 out of 50 images mismatch in overall grade), it invalidates the annotator's reliability, requiring a review.

## 9. Known-Good Subset Definition
The V1 weak-supervision path requires a verified "known-good" baseline. An image is admitted to the known-good subset IF AND ONLY IF:
1. Overall Grade is unanimously **A** (Annotator 1 = A, Annotator 2 = A, or Adjudicator = A).
2. ALL 10 quality dimensions are marked **PASS** by both annotators (or Adjudicator).
3. No `rejection_reasons` are flagged.
4. No `UNCERTAIN` labels are present anywhere.

## 10. Synthetic Degradation Freeze
No synthetic data (blur, contrast shifts, etc.) may be generated until the **Known-Good Subset** is formally established via this clinical protocol. Synthetic data remains a validation aid, not clinical ground truth.
