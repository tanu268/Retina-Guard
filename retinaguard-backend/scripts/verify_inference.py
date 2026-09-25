import sys
import os
import json
import torch
import cv2
import onnxruntime
import numpy as np

sys.path.insert(0, r"D:\Retina-Guard\model\RetinaGuard_ML")
from src.preprocessing import retina_guard_baseline_preprocess

def softmax(x):
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum(axis=-1, keepdims=True)

def run():
    file = sys.argv[1]
    
    tensor = retina_guard_baseline_preprocess(file)
    # add batch dimension
    input_data = np.expand_dims(tensor.numpy(), axis=0)
    
    session = onnxruntime.InferenceSession(r"D:\Retina-Guard\model\retinaguard_resnet18.onnx")
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    
    result = session.run([output_name], {input_name: input_data})
    logits = result[0][0].tolist()
    
    probs = softmax(logits).tolist()
    pred_class = int(np.argmax(probs))
    confidence = float(probs[pred_class])
    ref_prob = float(sum(probs[2:]))
    
    print(json.dumps({
        "engine": "python",
        "logits": logits,
        "probabilities": probs,
        "predictedClass": pred_class,
        "confidence": confidence,
        "referableProbability": ref_prob
    }, indent=2))

if __name__ == "__main__":
    run()
