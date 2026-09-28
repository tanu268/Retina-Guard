# T-806 DATA READINESS REPORT

## 1. Executive Result
DATA INSUFFICIENT

## 2. Requirements
The quality subsystem must validate Field Coverage, Focus / Blur, Fine Structure, Illumination Uniformity, Exposure, Contrast, Colour Balance, Landmark Visibility, Artifact Burden, and Decodability.

## 3. Repository Inventory
- **APTOS 2019 (`train_manifest.csv`, `val_manifest.csv`):** Contains DR severity labels (0-4). Quality labels: MISSING.
- **IDRiD (`idrid_segmentation_manifest.csv`):** Contains segmentation masks. Quality labels: MISSING.
There is absolutely no quality-labelled data or documented "known-good" subset in the local repository.

## 4. External Candidates
- **M-FIQ (Mobile FIQA):** Multi-label dataset with Good/Usable/Reject and explicit degradation factors (blur, illumination, field of view).
- **EyeQ:** 28,792 images with Good/Usable/Reject labels, derived from EyePACS.
- **FIQS:** 2,246 images with continuous MOS scores and categorical grades.

## 5. Coverage Matrix

### M-FIQ Dataset
| Requirement | Direct label | Proxy only | Missing |
|-------------|--------------|------------|---------|
| Field Coverage | X | | |
| Focus / Blur | X | | |
| Fine Structure | | X | |
| Illumination | X | | |
| Exposure | X | | |
| Contrast | | X | |
| Colour Balance | | | X |
| Landmark Visibility | | X | |
| Artifact Burden | X | | |
| Decodability | | | X |

### EyeQ Dataset
| Requirement | Direct label | Proxy only | Missing |
|-------------|--------------|------------|---------|
| Field Coverage | | | X |
| Focus / Blur | | | X |
| Fine Structure | | | X |
| Illumination | | | X |
| Exposure | | | X |
| Contrast | | | X |
| Colour Balance | | | X |
| Landmark Visibility | | | X |
| Artifact Burden | | | X |
| Decodability | | | X |
*(Note: EyeQ provides the final A/B/C grade but no specific rejection reason labels.)*

## 6. Provenance
- M-FIQ originates from teleophthalmology screening clinics.
- EyeQ originates from EyePACS, professionally re-annotated by ophthalmologists for RIQA research.

## 7. Licensing / Usage
EyeQ is available for research but requires adherence to EyePACS usage agreements. M-FIQ's public availability and commercial terms must be explicitly cleared by legal.

## 8. Annotation Quality
External datasets (EyeQ, M-FIQ) are annotated by expert ophthalmologists and represent legitimate clinical ground truth for image quality.

## 9. Weak-Supervision Assessment
The V1 weak-supervision path (synthetic degradation of "known-good" images) is **NOT CURRENTLY SUPPORTABLE**. 
- To use this path, the project requires a verified set of legitimate "known-good" images.
- None of the local datasets (APTOS, IDRiD) have been clinically signed off as "good quality".
- Applying synthetic blur to an image that is already clinically blurry breaks the ground truth validation.
- A clinician must first manually review and isolate a "known-good" subset before synthetic degradations can be safely applied.

## 10. Leakage / Duplicate Audit
External datasets must be hash-checked against the local APTOS and IDRiD datasets before use. EyeQ (from EyePACS) typically overlaps with Kaggle Diabetic Retinopathy datasets, and cross-contamination with the local APTOS dataset must be rigorously verified before claiming independent validation.

## 11. Required Fixtures
To satisfy G15, the following fixtures MUST be obtained:
- **ACCEPTABLE:** normal usable fundus
- **UNACCEPTABLE:** insufficient field coverage, severe blur, severe illumination problem, severe exposure problem, severe contrast degradation, severe color imbalance, severe artifact, landmark obstruction
- **PLUS:** valid/decodable image, unreadable/corrupt image

## 12. Data Gaps
1. **Missing Rejection Reasons:** Most public datasets (like EyeQ) only provide the final grade (Good/Usable/Reject) without the explicit cause (e.g., blur, illumination) required to validate individual quality dimensions.
2. **Missing Known-Good Subset:** The local repository lacks a clinically verified "known-good" dataset necessary for the weak-supervision synthesis route.

## 13. Recommended Next Engineering Step
Acquire the **M-FIQ** dataset (or similar multi-label FIQA dataset) and perform a hash-based leakage audit against the local training data. Alternatively, formally annotate a 500-image subset of the local APTOS dataset as "known-good" through clinical review to unlock the weak-supervision path.

## 14. G15 Readiness
**BLOCKED**
