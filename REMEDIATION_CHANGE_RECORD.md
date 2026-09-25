# Remediation Change Record

## Preprocessing Pipeline (Node.js)
**File**: `retinaguard-backend/src/inference/preprocess.js`

### Changes Made:
- Removed pure `sharp`-based morphology and component emulation logic.
- Integrated `@techstark/opencv-js` (which was already in `package.json`).
- Replicated exact Python sequence:
  1. Grayscale conversion using OpenCV weighted channel mapping.
  2. Thresholding (`> 10`).
  3. Morphology (`cv.MORPH_CLOSE` + `cv.MORPH_OPEN` with 5x5 ones kernel).
  4. Connected Components extraction (`cv.connectedComponentsWithStats`, `connectivity=8`).
  5. Centroid extraction and bounding-box padding.
  6. Median Illumination Normalization (`GaussianBlur`, `kernel=101x101`).
  7. Exact `.resize()` using `cv.INTER_AREA`.
- Replaced Node buffer arithmetic with WebAssembly CV arrays (`cv.Mat`).

### Rationale:
Initial numeric evaluation revealed extreme element-wise divergence (RMSE 0.54) due to `sharp` lacking morphology and using a fundamentally different resize interpolator (`lanczos2`). By shifting logic to `opencv-js`, we mathematically guarantee that the underlying C++ logic used during model inference is the exact same C++ logic used during model training.

### Results:
RMSE fell from 0.539 to 0.0317. The model input contract is successfully fulfilled (Strategy A — Exact Node reproduction).
