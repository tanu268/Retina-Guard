# T-806 DATASET CANDIDATES

## 1. EyeQ Dataset
- **Publisher / Source:** Subset of the EyePACS dataset (re-annotated).
- **Number of Images:** 28,792 retinal images.
- **Quality Annotation Scheme:** Three-level categorical grading ("Good", "Usable", "Reject").
- **Rejection Reasons:** Missing. (The dataset provides the final A/B/C grade but lacks explicit multi-label annotations for specific degradations like blur or illumination).
- **Clinical Annotations:** Yes, graded by experts.
- **Public Accessibility:** Publicly accessible (often requires EyePACS usage agreement).
- **Usage:** Widely used as a benchmark for training and testing FIQA networks.

## 2. M-FIQ (Mobile Fundus Image Quality Assessment Dataset)
- **Publisher / Source:** Teleophthalmology screening environments (Mobile devices).
- **Number of Images:** Not strictly defined in the abstract, but designed for mobile teleophthalmology.
- **Quality Annotation Scheme:** Three-level grading ("Good", "Usable", "Reject") PLUS multi-label annotations.
- **Rejection Reasons:** Yes. Includes explicit labels for low sharpness (blur), underexposure, overexposure, incomplete field of view, and peripheral shadowing.
- **Clinical Annotations:** Yes.
- **Public Accessibility:** Varies by institution.
- **Usage:** Directly supports the multi-label degradation requirements defined in the RetinaGuard blueprint.

## 3. FIQS (Fundus Image Quality Scores)
- **Publisher / Source:** Recent FIQA benchmark.
- **Number of Images:** 2,246 fundus images.
- **Quality Annotation Scheme:** Continuous Mean Opinion Scores (MOS) ranging from 0 to 100, plus categorical ("Good", "Usable", "Reject").
- **Rejection Reasons:** Missing/Proxy (focused on the continuous score).
- **Clinical Annotations:** Scored by multiple professional ophthalmologists.
- **Public Accessibility:** Publicly available (e.g., via figshare).

---

## Conclusion
- **PRIMARY CANDIDATE:** **M-FIQ Dataset**. It is the only candidate that provides explicit multi-label degradation annotations (blur, illumination, field of view) required to fulfill the deterministic requirements of `T805_QUALITY_REQUIREMENTS.md`.
- **ALTERNATIVE CANDIDATE:** **EyeQ Dataset**. While it lacks explicit rejection reasons, its large size and clinical "Reject" labels make it a strong candidate for an end-to-end classifier (or for the overall gradeability model).
- **DATA GAP:** The local repository contains absolutely no quality-labelled data or verified "known-good" images. External data MUST be acquired.
