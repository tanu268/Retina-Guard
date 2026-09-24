import sys
import os
import json
import torch
import cv2
import numpy as np

sys.path.insert(0, r"D:\Retina-Guard\model\RetinaGuard_ML")
from src.preprocessing import retina_guard_baseline_preprocess

def run():
    if len(sys.argv) < 3:
        print("Usage: python export_tensor.py <image_path> <output_path>")
        sys.exit(1)
        
    file = sys.argv[1]
    out = sys.argv[2]
    
    tensor = retina_guard_baseline_preprocess(file)
    arr = tensor.numpy()
    
    with open(out, 'wb') as f:
        f.write(arr.tobytes())
        
    print(json.dumps({"status": "ok", "file": out}))

if __name__ == "__main__":
    run()
