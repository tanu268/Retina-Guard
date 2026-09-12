# APTOS 2019 — ML Handoff

## Dataset status

APTOS 2019 labelled dataset prepared for model development.

Original labelled images: 3662
Cleaned images: 3504

The unlabelled APTOS test set is not included in this pipeline because it
does not have ground-truth labels for supervised training or evaluation.

---

## Image location

Original/cleaned image files:

D:\RetinaGuard_Data\aptos2019\train_images\

Images are identified by `id_code` and use `.png` extension.

Example:

id_code:
000c1434d8d7

image:
D:\RetinaGuard_Data\aptos2019\train_images\000c1434d8d7.png

---

## Available manifests

### cleaned_manifest.csv

Location:

D:\RetinaGuard_Data\aptos2019\processed\cleaned_manifest.csv

Contains all 3504 retained images.

Columns:

- `id_code` — image identifier
- `diagnosis` — APTOS DR grade, 0–4
- `image_hash` — SHA-256 image-content hash used during duplicate analysis

---

### train_manifest.csv

Location:

D:\RetinaGuard_Data\aptos2019\processed\train_manifest.csv

Contains 2803 images.

Columns:

- `id_code`
- `diagnosis`
- `image_hash`
- `image_path`

This is the training split.

---

### val_manifest.csv

Location:

D:\RetinaGuard_Data\aptos2019\processed\val_manifest.csv

Contains 701 images.

Columns:

- `id_code`
- `diagnosis`
- `image_hash`
- `image_path`

This is the validation split.

The split was created using stratification with random_state=42.

Do not rebalance or augment the validation set.

---

## Training distribution

| Diagnosis | Meaning | Training | Validation | Total |
|---|---|---:|---:|---:|
| 0 | No DR | 1437 | 359 | 1796 |
| 1 | Mild NPDR | 270 | 68 | 338 |
| 2 | Moderate NPDR | 737 | 185 | 922 |
| 3 | Severe NPDR | 142 | 35 | 177 |
| 4 | Proliferative DR | 217 | 54 | 271 |
| **Total** | | **2803** | **701** | **3504** |

---

## Class weights

Location:

D:\RetinaGuard_Data\aptos2019\processed\class_weights.csv

Weights were calculated from the training split using:

weight = N / (K × class_count)

where:

- N = 2803 training images
- K = 5 classes

| Diagnosis | Training samples | Class weight |
|---|---:|---:|
| 0 | 1437 | 0.390118 |
| 1 | 270 | 2.076296 |
| 2 | 737 | 0.760651 |
| 3 | 142 | 3.947887 |
| 4 | 217 | 2.583410 |

These weights are provided as framework-independent metadata.

The training implementation may use them through the loss function or
another appropriate class-balancing mechanism after the training framework
and model architecture are selected.

Do not apply these weights to validation metrics.

---

## Duplicate cleaning

Duplicate analysis identified:

- 123 duplicate image-content groups
- 93 same-label duplicate groups
- 30 conflicting-label duplicate groups
- 128 duplicate occurrences

The cleaning process removed/quarantined 158 images.

Removed images were moved to:

D:\RetinaGuard_Data\aptos2019\processed\quarantine\

The duplicate analysis record is available at:

D:\RetinaGuard_Data\aptos2019\processed\duplicate_groups.csv

---

## Data integrity checks

Before cleaning:

- CSV rows: 3662
- Image files found: 3662
- Missing images: 0
- Extra images: 0
- Corrupted/unreadable images: 0
- File extension: PNG

After cleaning:

- Retained images: 3504
- Missing files in split preparation: 0

---

## Important training notes

1. Use `train_manifest.csv` for training.
2. Use `val_manifest.csv` for validation.
3. Do not randomly reshuffle the validation set into training.
4. Do not use the unlabelled APTOS test set for supervised metrics.
5. Handle class imbalance during training rather than deleting additional
   training images.
6. The class weights are supplied separately so the training implementation
   can use them according to the selected framework.
7. Image preprocessing, augmentation, architecture, ordinal-learning
   implementation, calibration and threshold selection are not fixed by
   this data-preparation step.

---

## Current status

APTOS data preparation is complete.

Ready for model-development work.