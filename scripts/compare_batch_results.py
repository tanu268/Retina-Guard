import json
import numpy as np
import sys

def calculate_metrics(diffs):
    if len(diffs) == 0:
        return {}
    diffs = np.array(diffs)
    return {
        "max_abs_diff": float(np.max(diffs)),
        "mean_abs_diff": float(np.mean(diffs)),
        "RMSE": float(np.sqrt(np.mean(diffs**2))),
        "median_abs_diff": float(np.median(diffs)),
        "P95_abs_diff": float(np.percentile(diffs, 95)),
        "P99_abs_diff": float(np.percentile(diffs, 99)),
        "percentage_leq_1e_6": float(np.mean(diffs <= 1e-6) * 100),
        "percentage_leq_1e_5": float(np.mean(diffs <= 1e-5) * 100),
        "percentage_leq_1e_4": float(np.mean(diffs <= 1e-4) * 100),
        "percentage_leq_1e_3": float(np.mean(diffs <= 1e-3) * 100)
    }

def main():
    with open('python_batch_results.json', 'r') as f:
        py_data = json.load(f)
    with open('node_batch_results.json', 'r') as f:
        node_data = json.load(f)
        
    tensor_diffs = []
    logit_diffs = []
    prob_diffs = []
    
    grade_matches = 0
    ref_matches = 0
    total = 0
    
    for filename in py_data:
        if filename not in node_data:
            continue
            
        py = py_data[filename]
        node = node_data[filename]
        
        t_py = np.array(py['tensor'])
        t_node = np.array(node['tensor'])
        tensor_diffs.extend(np.abs(t_py - t_node).tolist())
        
        l_py = np.array(py['logits'])
        l_node = np.array(node['logits'])
        logit_diffs.extend(np.abs(l_py - l_node).tolist())
        
        p_py = np.array(py['probabilities'])
        p_node = np.array(node['probabilities'])
        prob_diffs.extend(np.abs(p_py - p_node).tolist())
        
        if py['predicted_grade'] == node['predicted_grade']:
            grade_matches += 1
            
        if py['referable_flag'] == node['referable_flag']:
            ref_matches += 1
            
        total += 1
        
    tensor_metrics = calculate_metrics(tensor_diffs)
    
    logit_metrics = {
        "max_logit_abs_diff": float(np.max(logit_diffs)) if logit_diffs else 0,
        "mean_logit_abs_diff": float(np.mean(logit_diffs)) if logit_diffs else 0,
        "RMSE_logits": float(np.sqrt(np.mean(np.array(logit_diffs)**2))) if logit_diffs else 0,
    }
    
    prob_metrics = {
        "max_probability_abs_diff": float(np.max(prob_diffs)) if prob_diffs else 0,
        "mean_probability_abs_diff": float(np.mean(prob_diffs)) if prob_diffs else 0,
        "RMSE_probability": float(np.sqrt(np.mean(np.array(prob_diffs)**2))) if prob_diffs else 0,
    }
    
    print("=== TENSOR METRICS ===")
    print(json.dumps(tensor_metrics, indent=2))
    
    print("=== LOGIT METRICS ===")
    print(json.dumps(logit_metrics, indent=2))
    
    print("=== PROB METRICS ===")
    print(json.dumps(prob_metrics, indent=2))
    
    print(f"Grade Matches: {grade_matches}/{total}")
    print(f"Referable Matches: {ref_matches}/{total}")
    
    with open('INDEPENDENT_PREPROCESSING_TENSOR_PARITY.json', 'w') as f:
        json.dump(tensor_metrics, f, indent=2)
        
    onnx_metrics = {
        "logits": logit_metrics,
        "probabilities": prob_metrics,
        "grade_matches": f"{grade_matches}/{total}",
        "referable_matches": f"{ref_matches}/{total}"
    }
    with open('INDEPENDENT_ONNX_OUTPUT_PARITY.json', 'w') as f:
        json.dump(onnx_metrics, f, indent=2)

if __name__ == '__main__':
    main()
