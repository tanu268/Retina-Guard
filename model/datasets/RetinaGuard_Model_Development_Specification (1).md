# RetinaGuard — Model Development Specification

## 1. Purpose

This document is the implementation blueprint for the RetinaGuard MVP model-development phase.

The data-preparation phase is complete and frozen. The objective now is to develop, train, validate, evaluate, and save the machine-learning models that will form the core of RetinaGuard.

**Current scope: model development only.**

Do not implement full-stack integration, deployment, API/backend services, database infrastructure, authentication, user management, or the web/mobile application in this phase.

---

## 2. Frozen Data Sources

RetinaGuard uses two prepared datasets for different but complementary tasks.

### 2.1 APTOS 2019 — DR Classification

Purpose: predict diabetic-retinopathy severity from a fundus image.

| Label | Meaning |
|---:|---|
| 0 | No DR |
| 1 | Mild NPDR |
| 2 | Moderate NPDR |
| 3 | Severe NPDR |
| 4 | Proliferative DR |

Prepared dataset:

- Original labelled images: 3662
- Cleaned images: 3504
- Training images: 2803
- Validation images: 701

Training manifest:

`D:\RetinaGuard_Data\aptos2019\processed\train_manifest.csv`

Validation manifest:

`D:\RetinaGuard_Data\aptos2019\processed\val_manifest.csv`

Image directory:

`D:\RetinaGuard_Data\aptos2019\train_images\`

Class weights:

`D:\RetinaGuard_Data\aptos2019\processed\class_weights.csv`

The validation set must remain untouched and must not be used for training or augmentation.

The unlabelled APTOS test set must not be used for supervised training or evaluation.

### 2.2 IDRiD — Lesion Segmentation

Purpose: identify and localize retinal lesions and the optic disc.

Segmentation categories:

- MA — Microaneurysms
- HE — Haemorrhages
- EX — Hard Exudates
- SE — Soft Exudates
- OD — Optic Disc

Prepared binary masks:

`D:\RetinaGuard_Data\idrid\processed\binary_masks\`

Training masks:

`D:\RetinaGuard_Data\idrid\processed\binary_masks\train\`

Test masks:

`D:\RetinaGuard_Data\idrid\processed\binary_masks\test\`

Master manifest:

`D:\RetinaGuard_Data\idrid\processed\idrid_segmentation_manifest.csv`

The IDRiD processed dataset passed consistency validation:

- Image IDs verified
- Original image availability verified
- Mask mappings verified
- Processed mask availability verified
- Binary 0/1 encoding verified
- Image/mask dimensions verified
- No orphan masks
- No duplicate image IDs

Validation reported:

```text
Available expected masks : 363
Missing annotations      : 42
Processed binary masks   : 363
Invalid processed masks  : 0
Orphan processed masks   : 0
Dimension mismatches     : 0
Duplicate image IDs      : 0
```

Missing annotations are intentional. Do not fabricate masks for missing annotations.

---

## 3. Fixed Model Backbone

**EfficientNet-B0 is the required backbone.**

Do not replace EfficientNet-B0 with another backbone unless explicitly instructed later.

The model should prioritize:

- Efficient inference
- Reasonable memory usage
- Good accuracy
- Small model size
- Compatibility with later local/commodity-hardware optimization

---

## 4. Overall Model Strategy

RetinaGuard will initially use two model components:

```text
                    FUNDUS IMAGE
                         |
            +------------+------------+
            |                         |
            v                         v
   DR CLASSIFICATION            LESION SEGMENTATION
      EfficientNet-B0              EfficientNet-B0
            |                         |
            v                         v
      DR Grade 0–4             MA / HE / EX / SE / OD
      + Confidence                  Masks
            |                         |
            +------------+------------+
                         |
                         v
                EXPLAINABILITY
              Lesion Localization
                + Heatmap/Overlay
```

The classification and segmentation models should initially be developed as distinct model components. They may be used together during inference, but do not force joint multi-task training unless there is a demonstrated reason to do so.

---

# 5. Classification Model

## 5.1 Objective

Input:

`Fundus photograph`

Output:

`One DR severity class: 0, 1, 2, 3, or 4`

The model must also provide class probabilities so a confidence value can be derived.

## 5.2 Architecture

Required backbone:

`EfficientNet-B0`

High-level structure:

```text
Input Fundus Image
        |
        v
Preprocessing
        |
        v
EfficientNet-B0
        |
        v
Global Feature Representation
        |
        v
Classification Head
        |
        v
5-Class Output
        |
        v
DR Grade 0–4
+ Class Probabilities
```

The classification head must support five classes.

Do not rely on ordinary accuracy alone for model selection because the classes are imbalanced and the labels are ordered disease-severity levels.

---

# 6. Classification Training

## 6.1 Training data

Use:

`train_manifest.csv`

Do not manually recreate the training split. Use the existing `diagnosis` values as ground truth.

## 6.2 Validation data

Use:

`val_manifest.csv`

The validation set must:

- remain fixed
- not receive random training transformations
- not be used for gradient updates
- not be merged back into training
- be used consistently when comparing experiments

## 6.3 Class imbalance

Use the supplied training class weights:

`D:\RetinaGuard_Data\aptos2019\processed\class_weights.csv`

| Diagnosis | Training Samples | Weight |
|---:|---:|---:|
| 0 | 1437 | 0.390118 |
| 1 | 270 | 2.076296 |
| 2 | 737 | 0.760651 |
| 3 | 142 | 3.947887 |
| 4 | 217 | 2.583410 |

Weights were calculated using:

`weight = N / (K × class_count)`

where N = 2803 and K = 5.

Do not apply class weights when calculating validation metrics.

---

# 7. Classification Preprocessing

Conceptually:

```text
Load PNG
   |
   v
Validate/read image
   |
   v
Resize to selected model input size
   |
   v
Normalize
   |
   v
Convert to tensor
   |
   v
EfficientNet-B0
```

The exact input resolution should be selected based on EfficientNet-B0 requirements, available hardware, image quality, and validation performance. Record the selected resolution in the experiment configuration.

---

# 8. Classification Augmentation

Augmentation is allowed **only for training**.

Potential medically reasonable augmentations:

- Horizontal/vertical flip where anatomically appropriate
- Small rotations
- Mild brightness variation
- Mild contrast variation
- Mild color variation
- Controlled crop/resize operations

Avoid aggressive transformations that could create unrealistic retinal structures or destroy clinically relevant lesions.

Validation images must receive deterministic preprocessing only.

---

# 9. Classification Loss

Start with:

**Weighted Cross-Entropy**

Because DR grades are ordinal, investigate an ordinal-learning formulation only after establishing a strong EfficientNet-B0 baseline and only if it provides meaningful validation improvement.

Do not introduce unnecessary architectural complexity before establishing the baseline.

---

# 10. Classification Optimization

The training system should support:

- Adam or AdamW optimizer
- Learning-rate scheduling
- Early stopping
- Best-model checkpointing
- Reproducible random seeds
- Training/validation metric logging

Learning rate, batch size, epochs, scheduler, and regularization should remain experiment parameters rather than unexplained hard-coded assumptions.

---

# 11. Segmentation Model

## 11.1 Objective

Input:

`Fundus image`

Output:

Five lesion/anatomical masks:

`MA, HE, EX, SE, OD`

## 11.2 Architecture

Required encoder/backbone:

`EfficientNet-B0`

A U-Net-style decoder is the starting design.

```text
Input Fundus Image
        |
        v
Preprocessing
        |
        v
EfficientNet-B0 Encoder
        |
        v
Multi-scale Feature Representations
        |
        v
Segmentation Decoder
        |
        v
Five Output Channels
        |
        +---- MA
        +---- HE
        +---- EX
        +---- SE
        +---- OD
```

EfficientNet-B0 must remain the encoder/backbone.

---

# 12. Segmentation Training

Training must respect that annotations are not available for every lesion type on every image.

For each image and lesion type:

```text
Annotation exists
    -> use image/mask pair for that lesion loss

Annotation missing
    -> exclude that lesion from the corresponding loss
```

**A missing annotation is not automatically equivalent to “no lesion.”**

The training implementation must support a validity/availability mask for segmentation targets.

---

# 13. Segmentation Loss

Start with:

```text
Segmentation Loss =
    Dice Loss
    +
    Binary Cross-Entropy
```

Calculate loss per lesion channel and aggregate only over valid annotations.

Because lesions can be sparse, monitor whether the model is collapsing to mostly-background predictions.

---

# 14. Segmentation Preprocessing and Augmentation

The same spatial transformation must be applied to:

```text
Image
+
Corresponding segmentation mask
```

For example:

```text
Resize image
Resize mask using nearest-neighbor interpolation
```

Do not use interpolation that creates unwanted non-binary target values in binary masks.

Training augmentation must preserve image-mask alignment.

Validation/test preprocessing must be deterministic.

---

# 15. Training Loop

General model-training flow:

```text
Load training batch
        |
        v
Preprocess / augment
        |
        v
Forward pass
        |
        +-------------------+
        |                   |
        v                   v
Classification         Segmentation
prediction             prediction
        |                   |
        v                   v
Classification Loss    Segmentation Loss
        |                   |
        +---------+---------+
                  |
                  v
             Total Loss
                  |
                  v
            Backpropagation
                  |
                  v
             Optimizer Step
                  |
                  v
           End of Epoch
                  |
                  v
              Validation
                  |
                  v
       Save best model if improved
                  |
                  v
            Early stopping?
             /          \
           No            Yes
           |              |
           +----repeat    v
                    Final model
```

If classification and segmentation are separate models, each can have its own training loop and checkpoint.

Do not force joint multi-task training unless there is a demonstrated reason to do so.

---

# 16. Classification Evaluation

At minimum, report:

### Accuracy
Overall percentage of correct predictions.

### Quadratic Weighted Kappa (QWK)
Important because DR grades are ordinal.

### Macro F1-score
Important because it gives each class equal importance despite class imbalance.

### Confusion Matrix
Show actual class × predicted class.

Also record per-class precision, recall, and F1.

---

# 17. Segmentation Evaluation

At minimum, report:

- Dice Score
- IoU
- Precision
- Recall

Report these:

```text
MA
HE
EX
SE
OD

and

Mean across valid lesion types
```

Do not calculate a lesion metric on an image where that lesion's ground-truth annotation is unavailable.

---

# 18. Model Selection

Do not select a model using training loss alone.

For classification, consider:

1. QWK
2. Macro F1
3. Accuracy
4. Per-class performance
5. Confusion matrix
6. Calibration/confidence behavior

For segmentation, consider:

1. Mean Dice
2. Mean IoU
3. Per-lesion Dice
4. Recall
5. Precision

Select models using validation performance. Do not repeatedly tune against an unseen test set.

---

# 19. Inference Workflow

For a new fundus image:

```text
New Fundus Image
        |
        v
Image Validation
        |
        v
Deterministic Preprocessing
        |
        +--------------------------+
        |                          |
        v                          v
EfficientNet-B0              EfficientNet-B0
Classification               Segmentation
        |                          |
        v                          v
DR probabilities             5 lesion masks
        |                          |
        v                          v
DR Grade 0–4                 MA/HE/EX/SE/OD
        |                          |
        +------------+-------------+
                     |
                     v
              Explainability
                     |
          +----------+----------+
          |                     |
          v                     v
     Classification         Lesion
       Heatmap              Overlays
       (optional)            / masks
```

Conceptual final output:

```text
DR Grade
Confidence / class probabilities
MA mask
HE mask
EX mask
SE mask
OD mask
Explainability visualization
```

---

# 20. Explainability

Explainability is an important part of RetinaGuard.

Segmentation provides spatial evidence by showing where lesions are located.

For classification, investigate a compatible gradient-based visualization such as:

`Grad-CAM`

The system should be able to generate an overlay showing important regions of the fundus image.

Explainability is supporting evidence, not an independent diagnosis.

---

# 21. Confidence and Calibration

The classification model must produce probabilities for all five DR grades.

Example:

```text
Grade 0: 0.03
Grade 1: 0.07
Grade 2: 0.82
Grade 3: 0.06
Grade 4: 0.02

Predicted grade: 2
Confidence: 0.82
```

Evaluate calibration after establishing a strong baseline.

Do not modify thresholds simply to improve validation numbers without recording the procedure.

---

# 22. Experiment Tracking

Every training experiment should record at least:

```text
Experiment ID
Random seed
Dataset/version
Model architecture
Input resolution
Batch size
Learning rate
Optimizer
Scheduler
Number of epochs
Augmentations
Loss function
Class weights
Training loss
Validation loss
Validation metrics
Best epoch
Checkpoint path
```

This is required so experiments remain reproducible and comparable.

---

# 23. Required Model Artifacts

Ultimately produce something equivalent to:

```text
models/
    classification/
        best_model.*
        config.yaml
        training_log.csv

    segmentation/
        best_model.*
        config.yaml
        training_log.csv
```

The exact framework-specific model extension can be selected during implementation.

Preserve the class weights and experiment metadata.

---

# 24. Reproducibility

Use fixed random seeds where practical.

Record:

- Python seed
- NumPy seed
- Framework seed
- Dataset split
- Model configuration
- Training hyperparameters

A second run with the same configuration should be reasonably reproducible.

---

# 25. Data Integrity Rules

These are mandatory:

- Do not modify the frozen datasets.
- Do not regenerate APTOS labels.
- Do not regenerate IDRiD masks.
- Do not move retained training/validation images.
- Do not add quarantined APTOS images back into training.
- Do not use the unlabelled APTOS test set for supervised metrics.
- Do not treat missing IDRiD annotations as negative masks.
- Do not augment the validation set.
- Do not leak validation information into training.
- Do not tune repeatedly against an unseen test set.

---

# 26. Current Scope

## IN SCOPE

```text
Dataset loading
        ↓
Preprocessing
        ↓
Training augmentation
        ↓
EfficientNet-B0 classification model
        ↓
EfficientNet-B0 segmentation model
        ↓
Loss functions
        ↓
Training
        ↓
Validation
        ↓
Hyperparameter experiments
        ↓
Evaluation
        ↓
Model selection
        ↓
Checkpointing
        ↓
Inference
        ↓
Explainability
        ↓
Model artifacts
```

## OUT OF SCOPE FOR NOW

```text
Frontend
Web application
Mobile application
FastAPI/backend
REST API
Database
Authentication
User management
Cloud deployment
Production monitoring
Hospital integration
Telemedicine workflow
```

These may be developed later after the model is stable.

---

# 27. Recommended Development Order

Do not attempt everything simultaneously.

## Phase A — Classification baseline

1. Load APTOS manifests.
2. Verify labels and paths.
3. Implement preprocessing.
4. Implement EfficientNet-B0 classification model.
5. Implement weighted cross-entropy.
6. Train baseline.
7. Evaluate on validation set.
8. Save checkpoint and metrics.

## Phase B — Classification improvement

Experiment with:

- learning rate
- batch size
- augmentation strength
- scheduler
- regularization
- input resolution
- ordinal-learning approach
- calibration

Compare experiments using the same validation protocol.

## Phase C — Segmentation baseline

1. Load IDRiD images and binary masks.
2. Respect missing annotations.
3. Implement EfficientNet-B0 encoder.
4. Implement segmentation decoder.
5. Implement Dice + BCE loss.
6. Train baseline.
7. Evaluate per lesion type.
8. Save checkpoint and metrics.

## Phase D — Segmentation improvement

Investigate:

- decoder design
- augmentation
- loss weighting
- input resolution
- learning rate
- threshold selection
- small-lesion handling

## Phase E — Combined inference

Run both trained models on the same fundus image:

```text
Image
  |
  +--> Classification --> DR Grade + Confidence
  |
  +--> Segmentation ----> Lesion Masks
  |
  +--> Explainability --> Heatmap / Overlay
```

Do not build the application around this yet.

First make sure the underlying model outputs are reliable.

---

# 28. Definition of Done

## Classification

- EfficientNet-B0 is trained.
- Validation metrics are recorded.
- QWK is reported.
- Macro F1 is reported.
- Confusion matrix is generated.
- Best checkpoint is saved.
- Class probabilities are available.

## Segmentation

- EfficientNet-B0 encoder is trained.
- Five output channels are supported.
- Missing annotations are handled correctly.
- Dice and IoU are reported.
- Per-lesion performance is reported.
- Best checkpoint is saved.
- Binary lesion masks can be generated.

## Combined inference

Given one valid fundus photograph, the system can produce:

```text
DR grade
+
confidence/probabilities
+
MA mask
+
HE mask
+
EX mask
+
SE mask
+
OD mask
+
explainability visualization
```

## Reproducibility

A complete configuration and training record exists for the selected models.

---

# 29. Critical Instruction to the Implementation Agent

Treat the existing prepared datasets as **frozen inputs**.

Do not redesign the data-preparation pipeline while implementing the models.

If a model-specific issue is discovered, stop and document the issue before changing the data.

The primary objective is:

> Build a strong, lightweight, reproducible RetinaGuard model using EfficientNet-B0 for DR classification and EfficientNet-B0-based segmentation for retinal lesion/anatomical localization, with reliable validation, evaluation, confidence estimation, and explainability.

**The model comes first. Deployment and full-stack integration come later.**
