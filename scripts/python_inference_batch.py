import os
import sys
import json
import numpy as np
import onnxruntime as ort
import torch
import torch.nn.functional as F

# Add model source to path for preprocessing
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../model/RetinaGuard_ML')))
from src.preprocessing import retina_guard_baseline_preprocess

def get_class_and_referable(probs):
    grade = int(np.argmax(probs))
    ref_prob = float(probs[2] + probs[3] + probs[4])
    is_referable = ref_prob >= 0.50
    return grade, ref_prob, is_referable

def run_python_inference(manifest_path, model_path, output_path):
    with open(manifest_path, 'r', encoding='utf-8-sig') as f:
        manifest = json.load(f)
    
    session = ort.InferenceSession(model_path)
    input_name = session.get_inputs()[0].name
    
    results = {}
    
    for item in manifest['images']:
        img_path = item['path']
        filename = item['filename']
        print(f"Processing Python: {filename}")
        
        # 1. Preprocess
        tensor = np.expand_dims(retina_guard_baseline_preprocess(img_path).numpy(), axis=0)
        
        # 2. Inference
        logits = session.run(None, {input_name: tensor})[0][0]
        
        # 3. Postprocess
        probs = F.softmax(torch.tensor(logits), dim=0).numpy()
        grade, ref_prob, is_ref = get_class_and_referable(probs)
        
        results[filename] = {
            'tensor': tensor.flatten().tolist(), # Store flattened array
            'logits': logits.tolist(),
            'probabilities': probs.tolist(),
            'predicted_grade': grade,
            'referable_probability': ref_prob,
            'referable_flag': is_ref
        }
        
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f)
        
if __name__ == "__main__":
    manifest_path = "INDEPENDENT_PARITY_IMAGE_MANIFEST.json"
    model_path = "model/retinaguard_resnet18.onnx"
    output_path = "python_batch_results.json"
    run_python_inference(manifest_path, model_path, output_path)
