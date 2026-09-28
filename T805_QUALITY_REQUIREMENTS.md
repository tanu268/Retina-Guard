# T-805 QUALITY REQUIREMENTS

Based on the official RetinaGuard `SIH_26038_DR_Screening_Blueprint (1).md` (Section 9), the quality gate is a deterministic and learned ensemble that must evaluate the following explicit requirements before permitting DR inference:

| Requirement | Source | Measurable Signal | Acceptance Criterion | Validation Method |
|-------------|--------|-------------------|----------------------|-------------------|
| **Field Coverage** | Table 9.2 | Field-of-view mask coverage ratio (max-channel intensity thresholding) | FOV covers sufficient area; no major off-center crops. | Fixture images with varying FOV. |
| **Focus / Blur** | Table 9.2 | Laplacian/gradient variance inside FOV mask (green channel) | High variance indicates sharp focus. | Synthetic blurring (Gaussian) of good images. |
| **Fine Structure** | Table 9.2 | Vessel-resolvability index (detected vessel length & mean vesselness) | Key proxy: Fine vessels must be resolvable. | Cross-validated against vessel ground truth. |
| **Illumination Uniformity** | Table 9.2 | Ratio of 95th to 5th percentile of background field | Uniform lighting; no severe vignetting or flash arc. | Images with flash arcs vs even lighting. |
| **Exposure limits** | Table 9.2 | Fraction of saturated (≥250) and crushed (≤5) pixels | Minimal blown highlights or black crush. | Synthetically under/overexposed images. |
| **Contrast** | Table 9.2 | Standard deviation & IQR of the green channel | High contrast; no severe haze or cataract opacity. | Contrast-reduced synthetic images. |
| **Colour Balance** | Table 9.2 | Channel means and red-channel saturation fraction | Normal white balance; no severe red cast. | Colour-shifted images. |
| **Landmark Visibility** | Table 9.2 | Optic disc and Macula detectability/contrast | Both landmarks are confidently findable. | Images with central obscurations. |
| **Artifact Burden** | Table 9.2 | Morphological top-hat / shape filtering for bright arcs | Low interference from lash, dust, lens flare. | Images with known artifacts. |
| **Decodability** | Section 9 | Successful JPEG decode | Image structurally valid. | Corrupt `.jpg` headers. |

*Any requirement not listed here is explicitly marked UNSPECIFIED and must not be invented.*
