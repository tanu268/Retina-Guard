import json
import os

with open('/home/yash/Desktop/Projects/Retina-Guard/validation/phase19/node_predictions_701.json', 'r') as f:
    results = json.load(f)

TP = TN = FP = FN = 0
exact_agreement = 0
referable_agreement = 0
confidences = []

# Load Python predictions for comparison
with open('/home/yash/Desktop/Projects/Retina-Guard/validation/fresh_701/fresh_predictions_701.json', 'r') as f:
    py_results = json.load(f)

py_map = {item['filename']: item for item in py_results}

for item in results:
    t = item['true_label'] >= 2
    p = item['predicted_grade'] >= 2
    
    if t and p: TP += 1
    elif not t and not p: TN += 1
    elif not t and p: FP += 1
    elif t and not p: FN += 1
    
    confidences.append(item['confidence'])
    
    py = py_map.get(item['filename'])
    if py:
        if py['predicted_grade'] == item['predicted_grade']:
            exact_agreement += 1
        if (py['predicted_grade'] >= 2) == (item['predicted_grade'] >= 2):
            referable_agreement += 1

sens = TP / (TP + FN) if (TP + FN) > 0 else 0
spec = TN / (TN + FP) if (TN + FP) > 0 else 0
acc = (TP + TN) / len(results) if len(results) > 0 else 0
ppv = TP / (TP + FP) if (TP + FP) > 0 else 0
npv = TN / (TN + FN) if (TN + FN) > 0 else 0

metrics = {
    'total': len(results),
    'TP': TP,
    'TN': TN,
    'FP': FP,
    'FN': FN,
    'sensitivity': sens,
    'specificity': spec,
    'accuracy': acc,
    'PPV': ppv,
    'NPV': npv,
    'mean_confidence': sum(confidences) / len(confidences) if confidences else 0,
    'exact_agreement_with_python': exact_agreement,
    'referable_agreement_with_python': referable_agreement
}

with open('/home/yash/Desktop/Projects/Retina-Guard/validation/phase19/node_metrics_701.json', 'w') as f:
    json.dump(metrics, f, indent=2)

print(json.dumps(metrics, indent=2))
