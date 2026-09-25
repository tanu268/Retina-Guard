# Phase 2 — Training Contract Reconstruction

Based on the original training logic found in `d:\Retina-Guard\model\RetinaGuard_ML\src\preprocessing.py` and `dataset.py`, the preprocessing contract for inference is precisely reconstructed below.

## Image Properties
* **Image format:** Read in BGR, convert to RGB.
* **Color space:** RGB.
* **Datatype (intermediate):** uint8 [0, 255] before normalization, float32 [0.0, 1.0] after.
* **Target shape:** 384x384 pixels.

## Step-by-Step Processing
1. **Fundus Masking:**
   - Convert RGB image to grayscale.
   - Threshold at `> 10` to create binary mask.
   - Apply morphological closing then opening with a 5x5 kernel (`np.ones((5,5), np.uint8)`).
   - Find largest connected component.

2. **Cropping:**
   - Find bounding box of the non-zero mask pixels.
   - Pad the bounding box by exactly 5 pixels (`CROP_PADDING = 5`).
   - Crop the RGB image and the mask to this padded bounding box.

3. **Illumination Normalization:**
   - Identify valid pixels: grayscale value `> 5`.
   - Apply large-scale Gaussian blur (`kernel = 101`) to each RGB channel independently to estimate illumination.
   - Find the `median` of the blurred image for valid pixels.
   - Normalize each channel: `channel * (median / (illumination + 1e-6))`.
   - Re-mask out-of-bound pixels to 0, clip to `[0, 255]`, and cast back to `uint8`.

4. **Resizing:**
   - Resize to `384x384` using OpenCV `INTER_AREA` interpolation (`cv2.INTER_AREA`).

5. **Normalization:**
   - Convert to `float32` and scale to `[0.0, 1.0]` by dividing by 255.0.
   - Subtract custom dataset mean and divide by standard deviation (these are NOT ImageNet statistics):
     - `mean`: `[0.5349806816307564, 0.28220984649945235, 0.08492041400629491]`
     - `std`:  `[0.156245401744425, 0.08246304756518061, 0.06740699565264736]`

6. **Tensor Construction:**
   - Convert from `HWC` to `CHW` (Channel, Height, Width).
   - Expand to `NCHW` for batch inference, datatype is `float32`.

## Training-Only Augmentations
The following are applied *only* during training (and are excluded from inference):
- Horizontal flip (p=0.5).
- Rotation (-15° to +15°) + Scale (0.95 to 1.05) (p=0.5).
- Brightness variation (±0.15) + Contrast variation (±0.15) (p=0.5).

*Inference preprocessing uses the purely deterministic base pipeline.*
