# Preprocessing Operation Matrix

| Stage | Training Implementation | Exact Parameters | Node Implementation | Exact Parameters | Status |
|---|---|---|---|---|---|
| Image load | OpenCV `imread` | BGR -> RGB | Sharp `removeAlpha().raw()` | RGB buffer | MATCH |
| Color conversion | `cv2.cvtColor(BGR2RGB)` | - | Native Sharp RGB | - | MATCH |
| Mask | `cv2.cvtColor(RGB2GRAY)` | `Y = 0.299*R + 0.587*G + 0.114*B` approx | Manual weighting | `0.299*R + 0.587*G + 0.114*B` | MATCH |
| Threshold | `gray > MASK_THRESHOLD` | 10 | `gray > MASK_THRESHOLD` | 10 | MATCH |
| Morphology | `morphologyEx` | `CLOSE 5x5`, `OPEN 5x5` | NONE | N/A | MISMATCH |
| Components | `connectedComponentsWithStats` | `connectivity=8`, largest area | NONE (uses any pixel > 10) | N/A | MISMATCH |
| Crop | Array slicing | `padding=5` | Sharp `extract()` + manual bound box | `padding=5` | MISMATCH (depends on mask) |
| Padding | Bounding box + 5 | `max(0)`, `min(dim)` | Bounding box + 5 | `Math.max(0)`, `Math.min(dim)` | MATCH |
| Illumination | `cv2.GaussianBlur` | `kernel=101x101`, `sigma=0` | Sharp `.blur()` | `sigma=25` | MISMATCH |
| Blur | `cv2.GaussianBlur` | `101x101` | Sharp `.blur()` | `sigma=25` | MISMATCH |
| Resize | `cv2.resize` | `384x384`, `INTER_AREA` | Sharp `.resize()` | `384x384`, `lanczos2` | MISMATCH |
| Normalization | `(x/255.0 - mean) / std` | `mean=[0.534, 0.282, 0.084]`, `std=[...` | `(x/255.0 - mean) / std` | Same | MATCH |
| Layout | `np.transpose` | `HWC -> CHW` | Loop extraction | `CHW` | MATCH |
| dtype | `np.float32` | `torch.from_numpy().float()` | `Float32Array` | `float32` | MATCH |
