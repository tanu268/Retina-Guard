#!/usr/bin/env python3
"""
retinaguard_gradcam.py — Production Class Activation Map generator for RetinaGuard.

Architecture: ResNet18 with GlobalAveragePool → Flatten → Linear(512→5)
CAM Method:   Analytical CAM (mathematically identical to Grad-CAM for GAP+Linear)
              w_c · A_k  where w_c are the FC weights for class c, A_k is the
              feature map for channel k from layer4.1.relu_1.

Usage (called as subprocess from onnxAdapter.js):
    python3 retinaguard_gradcam.py \
        --model   <path/to/retinaguard_resnet18.onnx> \
        --image   <path/to/fundus.png> \
        --class   <int 0-4>                  \
        --output  <path/to/output.png>       \
        [--size   384]

Exit codes:
    0  success — overlay PNG written to --output
    1  invalid CAM (uniform/zero) — stdout contains JSON with error
    2  runtime error — stderr contains traceback
"""
import sys
import json
import argparse
import struct
import os

import numpy as np
import onnxruntime as ort
import onnx
from onnx import numpy_helper
from PIL import Image

INPUT_SIZE = 384
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# Exactly the output of the last layer4 ReLU — this is the feature map before GAP
TARGET_LAYER_OUTPUT = '/backbone/layer4/layer4.1/relu_1/Relu_output_0'
FC_WEIGHT_NAME      = 'backbone.fc.1.weight'


def preprocess(image_path: str, size: int = INPUT_SIZE) -> np.ndarray:
    """Load, resize, normalize → float32 CHW tensor, shape [1,3,H,W]."""
    img = Image.open(image_path).convert('RGB')
    img = img.resize((size, size), Image.BILINEAR)
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = (arr - MEAN) / STD
    return arr.transpose(2, 0, 1)[np.newaxis, ...]  # [1,3,H,W]


def load_fc_weights(model_proto) -> np.ndarray:
    """Extract FC weight matrix [n_classes, n_channels] from ONNX initializers."""
    for init in model_proto.graph.initializer:
        if init.name == FC_WEIGHT_NAME:
            return numpy_helper.to_array(init)
    raise RuntimeError(f"FC weight '{FC_WEIGHT_NAME}' not found in ONNX initializers")


def build_cam_session(model_path: str):
    """
    Load the ONNX model and add the intermediate layer4 output as a graph output
    so onnxruntime returns it alongside logits.  The modified model is kept in
    memory; we do NOT overwrite the production model on disk.
    """
    model_proto = onnx.load(model_path)
    fc_weights = load_fc_weights(model_proto)

    # Append intermediate output
    vi = onnx.helper.make_tensor_value_info(TARGET_LAYER_OUTPUT, onnx.TensorProto.FLOAT, None)
    model_proto.graph.output.append(vi)

    serialized = model_proto.SerializeToString()
    sess = ort.InferenceSession(serialized, providers=['CPUExecutionProvider'])
    return sess, fc_weights, model_proto


def compute_cam(feature_map: np.ndarray, fc_weights: np.ndarray, class_idx: int) -> np.ndarray:
    """
    Compute Class Activation Map for `class_idx`.

    feature_map: [C, H, W]  (layer4 output, post-ReLU)
    fc_weights:  [n_classes, C]
    Returns:     [H, W] float32, normalized to [0,1] after ReLU.
    """
    w_c = fc_weights[class_idx]           # [C]
    cam = np.einsum('k,khw->hw', w_c, feature_map)  # [H,W]
    cam = np.maximum(cam, 0.0)            # ReLU: keep only positive contributions
    cam_min, cam_max = cam.min(), cam.max()
    if cam_max - cam_min < 1e-6:
        return None, cam_min, cam_max     # Invalid / uniform CAM
    cam_norm = (cam - cam_min) / (cam_max - cam_min)
    return cam_norm, cam_min, cam_max


def jet_colormap(gray_f32: np.ndarray) -> np.ndarray:
    """Convert [H,W] float [0,1] to [H,W,3] uint8 jet-like colormap."""
    x = gray_f32
    r = np.clip(1.5 - np.abs(x * 4 - 3), 0, 1)
    g = np.clip(1.5 - np.abs(x * 4 - 2), 0, 1)
    b = np.clip(1.5 - np.abs(x * 4 - 1), 0, 1)
    return (np.stack([r, g, b], axis=-1) * 255).astype(np.uint8)


def overlay_cam(image_path: str, cam_norm: np.ndarray,
                output_size: int = INPUT_SIZE, alpha: float = 0.45) -> Image.Image:
    """
    Blend original fundus image with jet-colored CAM.

    The original image is resized to output_size × output_size (same as model
    input) so that the overlay is pixel-aligned with the model's view of the
    image. This is the correct spatial mapping — no extra transforms.
    """
    orig = Image.open(image_path).convert('RGB').resize(
        (output_size, output_size), Image.BILINEAR
    )
    cam_upsampled = np.array(
        Image.fromarray((cam_norm * 255).astype(np.uint8)).resize(
            (output_size, output_size), Image.BILINEAR
        ),
        dtype=np.float32,
    ) / 255.0

    cam_colored = jet_colormap(cam_upsampled)
    orig_arr = np.array(orig, dtype=np.float32)
    blended = (orig_arr * (1 - alpha) + cam_colored * alpha).clip(0, 255).astype(np.uint8)
    return Image.fromarray(blended)


def main():
    parser = argparse.ArgumentParser(description='RetinaGuard Grad-CAM generator')
    parser.add_argument('--model',  required=True,  help='Path to retinaguard_resnet18.onnx')
    parser.add_argument('--image',  required=True,  help='Path to input fundus image')
    parser.add_argument('--class',  required=True,  type=int, dest='class_idx', help='Predicted class index (0-4)')
    parser.add_argument('--output', required=True,  help='Output overlay PNG path')
    parser.add_argument('--size',   default=INPUT_SIZE, type=int, help='Resize side (default 384)')
    args = parser.parse_args()

    if not os.path.isfile(args.model):
        print(json.dumps({'error': f'Model not found: {args.model}', 'cam_available': False}))
        sys.exit(1)

    if not os.path.isfile(args.image):
        print(json.dumps({'error': f'Image not found: {args.image}', 'cam_available': False}))
        sys.exit(1)

    if not (0 <= args.class_idx <= 4):
        print(json.dumps({'error': f'class_idx must be 0-4, got {args.class_idx}', 'cam_available': False}))
        sys.exit(1)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)

    # Run inference + extract feature map
    input_tensor = preprocess(args.image, args.size)
    sess, fc_weights, _ = build_cam_session(args.model)

    results = sess.run(['logits', TARGET_LAYER_OUTPUT], {'input': input_tensor})
    logits      = results[0][0]          # [5]
    feature_map = results[1][0]          # [512, 12, 12]

    # Softmax to verify class
    exp_l = np.exp(logits - logits.max())
    probs = exp_l / exp_l.sum()

    # Compute CAM for the requested class
    cam_norm, cam_min, cam_max = compute_cam(feature_map, fc_weights, args.class_idx)

    if cam_norm is None:
        result = {
            'cam_available': False,
            'reason': 'ZERO_VARIANCE_CAM',
            'class_idx': args.class_idx,
            'cam_min': float(cam_min),
            'cam_max': float(cam_max),
        }
        print(json.dumps(result))
        sys.exit(1)

    # Extract high-intensity regions for the frontend
    h, w = cam_norm.shape
    regions = []
    threshold = 0.6
    mask = cam_norm > threshold
    if np.any(mask):
        # Very simple single bounding box for the highest intensity region
        # Alternatively, connected components. Let's just provide the top peak as a single region for now, 
        # or bounding box of all pixels > threshold.
        coords = np.argwhere(mask)
        y_min, x_min = coords.min(axis=0)
        y_max, x_max = coords.max(axis=0)
        
        # We can also compute the peak within this box
        peak_y, peak_x = np.unravel_index(cam_norm.argmax(), cam_norm.shape)
        
        regions.append({
            'x': float(x_min) / w,
            'y': float(y_min) / h,
            'w': float(x_max - x_min + 1) / w,
            'h': float(y_max - y_min + 1) / h,
            'intensity': float(cam_norm[peak_y, peak_x])
        })
    else:
        # If no region > 0.6, just return the peak as a small region
        peak_y, peak_x = np.unravel_index(cam_norm.argmax(), cam_norm.shape)
        regions.append({
            'x': float(max(0, peak_x - 1)) / w,
            'y': float(max(0, peak_y - 1)) / h,
            'w': float(3) / w,
            'h': float(3) / h,
            'intensity': float(cam_norm[peak_y, peak_x])
        })

    in_border = bool(peak_y < 1 or peak_y >= h - 1 or peak_x < 1 or peak_x >= w - 1)

    # Generate and save overlay
    overlay = overlay_cam(args.image, cam_norm, args.size)
    overlay.save(args.output, format='PNG')

    result = {
        'cam_available':      True,
        'output_path':        args.output,
        'target_layer':       TARGET_LAYER_OUTPUT,
        'fc_weight_name':     FC_WEIGHT_NAME,
        'class_idx':          args.class_idx,
        'feature_map_shape':  list(feature_map.shape),
        'cam_shape':          [int(h), int(w)],
        'overlay_size':       [args.size, args.size],
        'cam_min':            float(cam_min),
        'cam_max':            float(cam_max),
        'peak_yx_cam_space':  [int(peak_y), int(peak_x)],
        'peak_in_border':     in_border,
        'probabilities':      [float(p) for p in probs],
        'regions':            regions,
    }
    print(json.dumps(result))
    sys.exit(0)


if __name__ == '__main__':
    main()
