# T-806.3.4 ANNOTATION HANDOFF

## Overview
This document specifies the operational handoff required for the execution of clinical human annotation on the initial APTOS 500-image known-good candidate cohort.

- **Cohort Size:** 500 images
- **Protocol Version:** 1.0 (as defined in `T806_2_ANNOTATION_PROTOCOL.md`)
- **Blinded Manifest Path:** `T806_3_4_BLINDED_ANNOTATOR_MANIFEST.csv`
- **Image Location:** `data/aptos2019/train_images/`

## Annotator Roles
- **Annotator 1 (Primary 1):** Qualified ophthalmologist or certified ophthalmic technician.
- **Annotator 2 (Primary 2):** Qualified ophthalmologist or certified ophthalmic technician.
- **Adjudicator:** Senior ophthalmologist.

## Blinding Requirements
- Annotators must remain strictly blinded to the actual DR diagnosis.
- Annotators must remain strictly blinded to any model predictions, model confidences, Grad-CAM visualizations, or quality scores.
- **CRITICAL:** NO model output or derived clinical prediction may be shown to annotators at any point.
- Annotators must remain blinded to each other's primary evaluations until required for formal adjudication.

## Annotation Schema & Format
Annotations must strictly adhere to `T806_2_ANNOTATION_SCHEMA.json`.
- The overall grade must be exclusively: A, B, C, or UNCERTAIN.
- All 10 individual dimensions must be explicitly marked: PASS, FAIL, or UNCERTAIN.
- Grades B and C must include explicitly defined `rejection_reasons`.
- Adjudicated records must include an explicit `adjudication_reason`.

## Storage
- **Primary 1 Annotations:** To be saved independently as `T806_3_ANNOTATIONS_PRIMARY_1.json`
- **Primary 2 Annotations:** To be saved independently as `T806_3_ANNOTATIONS_PRIMARY_2.json`
- **Adjudicated Annotations:** To be saved as `T806_3_ANNOTATIONS_ADJUDICATED.json`
- **Final Combined Annotations:** To be saved as `T806_3_ANNOTATIONS_FINAL.json`
- **NEVER** overwrite original primary annotations during the adjudication or re-grade processes.
