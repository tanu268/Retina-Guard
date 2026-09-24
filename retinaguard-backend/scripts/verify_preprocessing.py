import sys
import os
import json
import torch
import cv2

sys.path.insert(0, r"D:\Retina-Guard\model\RetinaGuard_ML")
from src.preprocessing import retina_guard_baseline_preprocess

def run():
    file = sys.argv[1]
    
    # Original dims
    img = cv2.imread(file)
    if img is None:
        print("Failed to read image")
        sys.exit(1)
        
    h, w, c = img.shape
    
    tensor = retina_guard_baseline_preprocess(file)
    
    arr = tensor.numpy()
    
    print(json.dumps({
        "engine": "python",
        "originalDimensions": [w, h],
        "processedDimensions": list(arr.shape[1:]),
        "dtype": str(arr.dtype),
        "channelOrder": "RGB",
        "tensorShape": list(arr.shape),
        "min": float(arr.min()),
        "max": float(arr.max()),
        "mean": float(arr.mean()),
        "std": float(arr.std())
    }, indent=2))

if __name__ == "__main__":
    run()
