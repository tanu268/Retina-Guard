# T-806.2 SAMPLING PLAN

## 1. Objective
To construct a defensible **INITIAL ANNOTATION COHORT** of 500 images for clinical quality grading, satisfying the strict data-leakage and confound-mitigation requirements of the RetinaGuard blueprint.

## 2. Source Restriction (Strict Leakage Prevention)
- **Allowed Source:** `APTOS_TRAIN` (`train_manifest.csv` only).
- **Explicit Exclusions:** `APTOS_VAL` (`val_manifest.csv`), `APTOS_TEST`, IDRiD datasets, and any images previously used as explicit unit-test or E2E test fixtures.

## 3. Sampling Strategy
The 500-image cohort will NOT be purely random. Purely random sampling in a heavily class-imbalanced dataset risks failing to adequately sample severe DR cases, exacerbating the "quality vs. severity" confound where sick eyes are mislabelled as bad quality.

**Stratified Sampling by DR Grade:**
The cohort will be strictly stratified across the 5 DR severity grades (0: No DR, 1: Mild, 2: Moderate, 3: Severe, 4: Proliferative) to ensure that true pathologies are represented and correctly disentangled from artifacts.

- Grade 0 (No DR): 150 images
- Grade 1 (Mild): 50 images
- Grade 2 (Moderate): 150 images
- Grade 3 (Severe): 75 images
- Grade 4 (Proliferative): 75 images
**Total:** 500 images.

## 4. Sampling Execution Protocol
1. **Seed:** Use cryptographic or fixed pseudo-random seed `T806_RG_2026` for deterministic selection.
2. **Hash Verification:** Every selected image must have its SHA-256 hash verified against the `cleaned_manifest.csv` and `val_manifest.csv` to guarantee it does not leak into the validation set.
3. **Duplicate Handling:** Any hash collision within the 500-image sample will be discarded and replaced with the next deterministically sampled image from the same stratum.

## 5. Manifest Generation & Blinding
Two distinct manifests will be generated to ensure strict clinical blinding.

**INTERNAL SAMPLING MANIFEST**
Maintained strictly by engineering. May contain:
- `image_id`
- `image_hash`
- `source_split`
- `DR grade` (used for stratification)

**BLINDED ANNOTATOR MANIFEST**
Provided to the clinical annotators. May contain ONLY:
- `image_id`
- `image_hash`
- `source_split`
*The DR grade used for sampling MUST NOT be exposed to clinical annotators.*

## 6. Statistical Representation
**Disclaimer:** This 500-image cohort is explicitly defined as an **INITIAL ANNOTATION COHORT** from which a known-good subset MAY be established. It is NOT claimed to be statistically sufficient for final clinical validation of a deep learning classifier.
