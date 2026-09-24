import json
import os
import math

with open('CLINICAL_EVALUATION_RESULTS.json', 'r') as f:
    results = json.load(f)

print(f'Total results: {len(results)}')

gt_dist = {0:0, 1:0, 2:0, 3:0, 4:0}
pred_dist = {0:0, 1:0, 2:0, 3:0, 4:0}
ref_gt_dist = {True:0, False:0}
ref_pred_dist = {True:0, False:0}

cm = {i: {j: 0 for j in range(5)} for i in range(5)}

tp, tn, fp, fn = 0, 0, 0, 0

error_analysis = []

for r in results:
    actual = r['actual_grade']
    pred = r['predicted_grade']
    act_ref = r['actual_referable']
    pred_ref = r['predicted_referable']
    probs = r['probabilities']
    
    gt_dist[actual] += 1
    pred_dist[pred] += 1
    ref_gt_dist[act_ref] += 1
    ref_pred_dist[pred_ref] += 1
    
    cm[actual][pred] += 1
    
    if act_ref and pred_ref: tp += 1
    elif not act_ref and not pred_ref: tn += 1
    elif not act_ref and pred_ref: fp += 1
    elif act_ref and not pred_ref: fn += 1
    
    # Error analysis
    if actual != pred:
        error_type = 'correct'
        if actual < pred: error_type = 'over-call'
        if actual > pred: error_type = 'under-call'
        
        if abs(actual - pred) == 1:
            error_type += ' (adjacent-grade error)'
        else:
            error_type += ' (multi-grade error)'
            
        if act_ref and not pred_ref: error_type += ' [referable false negative]'
        if not act_ref and pred_ref: error_type += ' [referable false positive]'
        
        sorted_probs = sorted(probs, reverse=True)
        margin = sorted_probs[0] - sorted_probs[1]
        
        ref_prob = sum(probs[2:])
        error_analysis.append({
            'image_id': r['filename'],
            'ground_truth': actual,
            'prediction': pred,
            'confidence': sorted_probs[0],
            'referable_probability': ref_prob,
            'error_type': error_type,
            'margin': margin
        })

# Metrics calculation
precision = {}
recall = {}
f1 = {}
for i in range(5):
    tp_i = cm[i][i]
    fp_i = sum(cm[j][i] for j in range(5) if j != i)
    fn_i = sum(cm[i][j] for j in range(5) if j != i)
    p = tp_i / (tp_i + fp_i) if (tp_i + fp_i) > 0 else 0
    r = tp_i / (tp_i + fn_i) if (tp_i + fn_i) > 0 else 0
    f = 2 * p * r / (p + r) if (p + r) > 0 else 0
    precision[i] = p
    recall[i] = r
    f1[i] = f

macro_f1 = sum(f1.values()) / 5
weighted_f1 = sum(f1[i] * gt_dist[i] for i in range(5)) / len(results)

accuracy = sum(cm[i][i] for i in range(5)) / len(results)

ref_sens = tp / (tp + fn) if (tp + fn) > 0 else 0
ref_spec = tn / (tn + fp) if (tn + fp) > 0 else 0
ref_ppv = tp / (tp + fp) if (tp + fp) > 0 else 0
ref_npv = tn / (tn + fn) if (tn + fn) > 0 else 0
ref_f1 = 2 * ref_ppv * ref_sens / (ref_ppv + ref_sens) if (ref_ppv + ref_sens) > 0 else 0

with open('CONFUSION_MATRIX.csv', 'w') as f:
    f.write('Actual,Pred0,Pred1,Pred2,Pred3,Pred4\\n')
    for i in range(5):
        f.write(f'{i},{cm[i][0]},{cm[i][1]},{cm[i][2]},{cm[i][3]},{cm[i][4]}\\n')

with open('ERROR_ANALYSIS.csv', 'w') as f:
    f.write('image_id,ground_truth,prediction,confidence,referable_probability,error_type,margin\\n')
    for e in error_analysis:
        f.write(f"{e['image_id']},{e['ground_truth']},{e['prediction']},{e['confidence']},{e['referable_probability']},{e['error_type']},{e['margin']}\\n")

print(f'Accuracy: {accuracy}')
print(f'Macro F1: {macro_f1}')
print(f'Weighted F1: {weighted_f1}')
print(f'GT Dist: {gt_dist}')
print(f'Pred Dist: {pred_dist}')
print(f'Ref GT Dist: {ref_gt_dist}')
print(f'Ref Pred Dist: {ref_pred_dist}')
print(f'TP: {tp}, TN: {tn}, FP: {fp}, FN: {fn}')
print(f'Ref Sens: {ref_sens}')
print(f'Ref Spec: {ref_spec}')
print(f'Ref PPV: {ref_ppv}')
print(f'Ref NPV: {ref_npv}')
print(f'Ref F1: {ref_f1}')
print(f'Per class F1: {f1}')
print(f'Per class Precision: {precision}')
print(f'Per class Recall: {recall}')
