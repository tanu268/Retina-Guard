# T-806.5 CLINICAL ANNOTATOR CHECKLIST

## BEFORE ANNOTATION
- [ ] Confirm your clinical qualification (Ophthalmologist or Certified Ophthalmic Technician).
- [ ] Confirm you are using protocol version 1.0 (`T806_2_ANNOTATION_PROTOCOL.md`).
- [ ] Confirm you are fully blinded to any other annotator's results.
- [ ] Confirm you are using the correct blinded image cohort (`T806_3_4_BLINDED_ANNOTATOR_MANIFEST.csv`).
- [ ] Confirm no DR severity, model predictions, confidences, or Grad-CAM information is visible in the interface.

## DURING ANNOTATION
- [ ] Evaluate the raw fundus image only.
- [ ] Assign exactly one overall grade (A, B, C, or UNCERTAIN).
- [ ] Assess all ten quality dimensions (PASS, FAIL, or UNCERTAIN for each).
- [ ] Record applicable predefined degradation/rejection reasons for any B or C grade.
- [ ] Use the UNCERTAIN label when required by the protocol for ambiguous borderline cases.
- [ ] Do NOT infer image quality from the presence or severity of disease (disease does not equal bad quality).

## AFTER ANNOTATION
- [ ] Verify that all 500 images in the cohort have been fully annotated.
- [ ] Verify there are no duplicate or missing records in your batch.
- [ ] Ensure that timestamps and your unique annotator identity are preserved in the records.
- [ ] Export the final annotations as a strictly schema-compliant JSON file (`T806_2_ANNOTATION_SCHEMA.json`).
- [ ] Submit your annotations independently and DO NOT overwrite or modify any prior annotations or those of your peers.
