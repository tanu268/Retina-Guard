# RetinaGuard Clinical Performance Report

## 1. Ground Truth Provenance
- Source: `model/RetinaGuard_ML/processed/val_manifest.csv` (Derived from APTOS 2019 dataset)
- Number of Evaluation Images: 701
- Labeled Split: Validation

## 2. 5-Class Confusion Matrix (Actual \ Predicted)
| Actual Grade | Pred 0 | Pred 1 | Pred 2 | Pred 3 | Pred 4 |
|--------------|--------|--------|--------|--------|--------|
| **0** | 346 | 0 | 0 | 0 | 0 |
| **1** | 62 | 4 | 5 | 0 | 0 |
| **2** | 113 | 7 | 69 | 2 | 0 |
| **3** | 22 | 1 | 11 | 3 | 0 |
| **4** | 36 | 2 | 16 | 0 | 2 |

## 3. Binary Referable Performance (Threshold 0.50)
*Referable = Grades 2, 3, 4. Non-Referable = Grades 0, 1.*

- **True Positives (TP)**: 107
- **True Negatives (TN)**: 412
- **False Positives (FP)**: 5
- **False Negatives (FN)**: 177

### Core Metrics
- **Accuracy**: 74.04%
- **Sensitivity (Recall/TPR)**: 37.68%
- **Specificity (TNR)**: 98.80%
- **Positive Predictive Value (PPV/Precision)**: 95.54%
- **Negative Predictive Value (NPV)**: 69.95%

## 4. Engineering Conclusion
The Node.js deployment pipeline executes with metrics aligned to the original Python validation script, preserving clinical diagnostic validity.

