# T-806.5 CLINICAL ANNOTATION HANDOFF

## A. PURPOSE
The purpose of this handoff is to obtain clinically reviewed image-quality annotations for the initial 500-image APTOS cohort. This human-labeled data is strictly required to evaluate and validate the G15 image-quality gate for the RetinaGuard pipeline.

## B. REQUIRED PERSONNEL
- **Annotator 1 (Primary 1):** Qualified ophthalmologist OR certified ophthalmic technician.
- **Annotator 2 (Primary 2):** Qualified ophthalmologist OR certified ophthalmic technician.
- **Adjudicator:** Senior ophthalmologist.

## C. REQUIRED INPUTS
- **Blinded Image Cohort Location:** `data/aptos2019/train_images/`
- **Blinded Manifest:** `T806_3_4_BLINDED_ANNOTATOR_MANIFEST.csv`
- **Annotation Schema:** `T806_2_ANNOTATION_SCHEMA.json`
- **Annotation Protocol:** `T806_2_ANNOTATION_PROTOCOL.md`

## D. BLINDING
Annotators must evaluate the raw fundus images ONLY. They must NOT see or have access to:
- DR severity (ground truth labels).
- Internal sampling strata.
- Model predictions or confidences.
- Grad-CAM visualizations.
- Lesion evidence or any other derived clinical prediction.
- The other annotator's decisions.
- Adjudication outcomes during the independent grading phase.

## E. ANNOTATION TASK
Annotators must adhere strictly to `T806_2_ANNOTATION_PROTOCOL.md`. For each of the 500 images, annotators must assign:

**Overall Grade:**
- A (Acceptable)
- B (Usable with limitations)
- C (Reject/Ungradeable)
- UNCERTAIN

**Dimensions (Each must be evaluated as PASS, FAIL, or UNCERTAIN):**
1. field_coverage
2. focus_blur
3. fine_structure
4. illumination
5. exposure
6. contrast
7. colour_balance
8. landmark_visibility
9. artifact_burden
10. decodability

Any image receiving an overall grade of B or C must include explicitly recorded predefined degradation/rejection reasons. 

## F. INDEPENDENT REVIEW
Annotator 1 and Annotator 2 must independently annotate the complete 500-image cohort. Neither annotator may see the other's work or communicate about specific cases during the primary grading phase.

## G. ADJUDICATION
For any image where Annotator 1 and Annotator 2 disagree on the overall grade or ANY dimension, the senior ophthalmologist must review the case.
- The adjudicator reviews the image independently along with both primary grades.
- The adjudicator issues a final `ADJUDICATED` grade and explicit `adjudication_reason`.
- Original annotations from Primary 1 and Primary 2 must NEVER be overwritten.

## H. 10% RE-GRADE
Approximately 10% of the cohort (50 images) will be randomly duplicated and presented to Annotator 1 and Annotator 2 a second time, strictly blinded to their original results, at least 48 hours after their first pass. This determines intra-rater reliability.

## I. DATA FORMAT
All output must strictly conform to `T806_2_ANNOTATION_SCHEMA.json`.

## J. KNOWN-GOOD SUBSET
An image qualifies for the V1 Known-Good Subset ONLY when:
- Annotator 1 overall = A
- Annotator 2 overall = A
- All 10 dimensions = PASS (Annotator 1)
- All 10 dimensions = PASS (Annotator 2)
- No degradation/rejection reasons are present.
- No UNCERTAIN condition is flagged.

*Note: No current image in the 500-image cohort is considered "Known-Good" until this clinical review is fully completed and evaluated.*
