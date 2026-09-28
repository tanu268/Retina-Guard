# T-806.2 CLINICAL IMAGE-QUALITY ANNOTATION PROTOCOL

## 1. Overall Grade Definitions
Each image must receive a single, independent overall grade before component dimensions are analyzed:
- **A (ACCEPTABLE):** The image is of high quality; all major retinal structures are clearly visible. Fully gradeable.
- **B (USABLE):** The image has visible degradations (e.g., mild haze, partial shadowing) but remains sufficient for a reliable clinical DR diagnosis.
- **C (REJECT):** The image is fundamentally ungradeable due to severe degradations. A reliable clinical diagnosis is impossible.
- **UNCERTAIN:** The annotator cannot confidently determine if the image crosses the threshold from Usable to Reject.

## 2. Quality Dimension Definitions (PASS / FAIL / UNCERTAIN)
Annotators evaluate 10 explicit dimensions.

### Field Coverage
- **ACCEPT:** Retina fills the expected field of view; no major off-center cropping.
- **REJECT:** Extreme off-center capture where >30% of the relevant macular/disc region is cut off.
- **UNCERTAIN:** Borderline cropping that might hide peripheral lesions.
- **Decision Rule:** Reject only if the missing field objectively prevents full DR screening.

### Focus / Blur
- **ACCEPT:** Retinal structures and vessel margins are sufficiently resolved.
- **REJECT:** Severe defocus blur or motion blur prevents reliable clinical interpretation of lesions.
- **UNCERTAIN:** Mild blur where major vessels are seen but microaneurysms might be obscured.
- **Decision Rule:** If fine vessels (2nd/3rd order) cannot be traced in the macula, fail.

### Illumination Uniformity
- **ACCEPT:** Lighting is relatively even across the retina.
- **REJECT:** Severe vignetting, flash arcs, or uneven lighting creating artificial shadows that mimic or hide lesions.
- **UNCERTAIN:** Borderline uneven lighting that requires straining to interpret.
- **Decision Rule:** Fail if the lighting gradient creates diagnostic ambiguity.

*(Other dimensions follow the exact same structural rule: Exposure, Contrast, Colour Balance, Landmark Visibility, Artifact Burden, Fine Structure, Decodability).*

## 3. Rejection Reasons
Any image graded **C** or **B** MUST have at least one explicit rejection reason selected from the predefined schema list (e.g., `severe_blur`, `insufficient_fov`, `severe_underexposure`, `severe_artifact`). No free-text reasons are permitted for standard rejections.

## 4. Clinical Annotators & Blinding
- **Personnel:** 
  - Annotator 1: Certified Ophthalmic Technician or Ophthalmologist.
  - Annotator 2: Certified Ophthalmic Technician or Ophthalmologist.
  - Adjudicator: Senior Ophthalmologist.
- **Blinding Requirements:** Annotators will evaluate raw images ONLY. They will be strictly blinded to the patient's actual DR diagnosis, any model predictions, Grad-CAM overlays, and the other annotator's decisions.

## 5. Independent Annotation & Agreement Analysis
1. Annotators 1 and 2 independently grade the 500-image cohort. Their annotations are stored independently.
2. **Agreement Analysis:** Raw agreement percentage and Cohen's Kappa ($$\kappa$$) will be calculated for the overall A/B/C grade and each binary PASS/FAIL dimension.
3. If $$\kappa < 0.6$$ for any specific dimension, the definition for that dimension must be refined, and the subset re-annotated. Disagreements will not be averaged out or arbitrarily chosen.

## 6. Adjudication
For any image where Annotator 1 and 2 disagree on the Overall Grade (A/B/C):
- The Adjudicator reviews the image independently.
- The Adjudicator reviews both primary grades.
- The Adjudicator issues the final `ADJUDICATED` ground truth grade and records an explicit `adjudication_reason` in the notes.
- Original annotations are NEVER overwritten.

## 7. Quality Control: 10% Re-grade
- 50 images (~10% of the cohort) will be randomly duplicated and presented to Annotator 1 and Annotator 2 a second time, blinded, at least 48 hours after their first pass.
- Intra-rater consistency will be measured. Substantial deviation (>10%) invalidates the annotator's reliability.

## 8. Known-Good Subset Definition
The V1 weak-supervision path requires a verified "known-good" baseline. An image is admitted to the known-good subset IF AND ONLY IF:
1. Overall Grade is unanimously **A** (Annotator 1 = A, Annotator 2 = A).
2. ALL 10 quality dimensions are marked **PASS** by both annotators.
3. No artifact or degradation reasons are flagged.

## 9. Data Format & Privacy
- Annotations will be recorded in strict adherence to `T806_2_ANNOTATION_SCHEMA.json`.
- Patient identifiers are strictly prohibited. The system will rely exclusively on the `image_id` (hash-derived or APTOS specific alphanumeric ID).

## 10. Synthetic Degradation Freeze
No synthetic data (blur, contrast shifts, etc.) may be generated until the **Known-Good Subset** is formally established via this clinical protocol. Synthetic data remains a validation aid, not clinical ground truth.
