# T-806.3.3 APTOS ACQUISITION HANDOFF

## WHY DATA IS REQUIRED
The RetinaGuard repository contains dataset manifests (e.g., `train_manifest.csv`) detailing DR grades and image hashes, but it does NOT contain the actual physical fundus image files (`.png`). Without these images, the clinical annotation cohort required for the G15 image-quality gate cannot be generated, as the images cannot be visually evaluated, and data integrity checks (like SHA-256 hashing) cannot be executed.

## WHAT MUST BE PROVIDED
The project owner must provide the actual authorized APTOS image dataset corresponding identically to the existing manifests.

## WHAT MUST NOT BE PROVIDED
- Modified or relabelled images.
- Validation or test data silently substituted for training data.
- Arbitrary internet copies of datasets without clear provenance.
- Synthetic or model-generated images.

## EXPECTED DATASET
The exact APTOS training images corresponding to the 2,803 records listed in `model/datasets/train_manifest.csv`, alongside the 701 corresponding validation images (`model/datasets/val_manifest.csv`) required for strict leakage verification.

## EXPECTED DIRECTORY INPUT
According to `APTOS_HANDOFF.md`, the original pathing was structured as:
`D:\RetinaGuard_Data\aptos2019\train_images\`

If possible, reproduce an equivalent local directory structure (e.g., `data/aptos2019/train_images/`). However, any local directory is acceptable provided it can be mapped deterministically to the manifest image IDs and provenance is clearly documented.

## REQUIRED HUMAN ACTION
Provide the authorized dataset through an approved project-access mechanism in the execution environment. Acceptable mechanisms include:
- A mounted local dataset directory.
- An authorized dataset download performed by the human.
- Authorized credentialed dataset tooling (e.g., Kaggle CLI) configured directly in the environment.

*(Do NOT paste credentials or API tokens into chat.)*

## REQUIRED LOCAL VERIFICATION (RESUME CHECK)
Once the human supplies the dataset, the next agent execution must run an availability check to verify:
1. Every manifest image can be physically resolved.
2. The SHA-256 hash matches the `image_hash` in the manifest.
3. Successful image decoding.
4. Detection of any duplicate hashes.
5. Strict train/validation split separation.
6. Reconciliation of DR-grade manifest counts.
7. Eventual establishment of the 500-image deterministic sampling cohort.

*Note: T-806.3 cohort generation and T-807 algorithm development remain strictly BLOCKED until this verification succeeds.*
