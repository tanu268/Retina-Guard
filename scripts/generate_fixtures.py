#!/usr/bin/env python3
"""Generate synthetic fixture cases for frontend development.

These are placeholder images (solid-colour discs on a gradient background) —
NOT real fundus photographs and NOT derived from any patient data. They exist
only so the reviewer app has something to render before the ML pipeline
produces real output.

Usage:
    python scripts/generate_fixtures.py
"""
import json
import random
from pathlib import Path

from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = REPO_ROOT / "fixtures" / "cases"


def synth_fundus(size: tuple[int, int], seed: int, tint: tuple[int, int, int]) -> Image.Image:
    """A clearly-synthetic placeholder: radial gradient + a 'disc' + a few dots.
    Explicitly not photorealistic, so nobody mistakes it for real patient data."""
    random.seed(seed)
    w, h = size
    img = Image.new("RGB", size, (10, 10, 10))
    draw = ImageDraw.Draw(img)

    cx, cy, r = w // 2, h // 2, min(w, h) // 2 - 4
    for i in range(r, 0, -2):
        shade = tuple(min(255, int(c * (1 - i / r) + 20)) for c in tint)
        draw.ellipse([cx - i, cy - i, cx + i, cy + i], fill=shade)

    disc_r = r // 6
    draw.ellipse(
        [cx + r // 3 - disc_r, cy - disc_r, cx + r // 3 + disc_r, cy + disc_r],
        fill=(255, 220, 180),
    )

    for _ in range(random.randint(3, 14)):
        x = random.randint(cx - r + 20, cx + r - 20)
        y = random.randint(cy - r + 20, cy + r - 20)
        dr = random.randint(2, 6)
        draw.ellipse([x - dr, y - dr, x + dr, y + dr], fill=(140, 20, 20))

    draw.text((10, 10), "SYNTHETIC FIXTURE - NOT A REAL FUNDUS IMAGE", fill=(255, 255, 0))
    return img


CASES = [
    {
        "name": "grade0-clear",
        "grade": 0, "label": "no_dr", "quality": "A",
        "ordinal": [0.05, 0.02, 0.01, 0.00],
        "referable": False, "confidence": 0.97, "band": "high",
        "triage": "P3", "abstained": False, "rules": [],
        "code": "RESCREEN_ROUTINE",
        "text": "No referable DR detected in this image. Routine annual rescreen.",
        "tint": (60, 20, 20), "red_lesions": 0, "exudates": 0,
    },
    {
        "name": "grade1-mild",
        "grade": 1, "label": "mild_npdr", "quality": "A",
        "ordinal": [0.91, 0.18, 0.04, 0.01],
        "referable": False, "confidence": 0.88, "band": "high",
        "triage": "P3", "abstained": False, "rules": [],
        "code": "RESCREEN_ROUTINE",
        "text": "Mild non-proliferative DR. Not referable. Rescreen in 6-12 months.",
        "tint": (70, 25, 20), "red_lesions": 3, "exudates": 0,
    },
    {
        "name": "grade2-moderate-referable",
        "grade": 2, "label": "moderate_npdr", "quality": "A",
        "ordinal": [0.94, 0.83, 0.21, 0.06],
        "referable": True, "confidence": 0.83, "band": "moderate",
        "triage": "P2", "abstained": False, "rules": [],
        "code": "REFER_ROUTINE",
        "text": "Referable DR suspected (moderate NPDR or worse). Routine referral priority.",
        "tint": (80, 25, 15), "red_lesions": 12, "exudates": 5,
    },
    {
        "name": "grade4-urgent",
        "grade": 4, "label": "proliferative_dr", "quality": "A",
        "ordinal": [0.99, 0.97, 0.89, 0.81],
        "referable": True, "confidence": 0.91, "band": "high",
        "triage": "P1", "abstained": False, "rules": ["E7"],
        "code": "REFER_URGENT",
        "text": "Findings consistent with proliferative DR. Urgent referral - sight-threatening.",
        "tint": (90, 15, 10), "red_lesions": 34, "exudates": 11,
    },
    {
        "name": "gradeC-ungradeable",
        "grade": None, "label": None, "quality": "C",
        "ordinal": None,
        "referable": None, "confidence": None, "band": None,
        "triage": "P0", "abstained": False, "rules": [],
        "code": "CANNOT_ASSESS",
        "text": "Image could not be graded. Recapture required.",
        "tint": (15, 15, 15), "red_lesions": 0, "exudates": 0,
        "reason": "Out of focus - refocus on the optic disc and recapture.",
    },
    {
        "name": "grade2-abstained-uncertain",
        "grade": 2, "label": "moderate_npdr", "quality": "B",
        "ordinal": [0.88, 0.44, 0.15, 0.03],
        "referable": None, "confidence": 0.52, "band": "low",
        "triage": "P0", "abstained": True, "rules": ["E2"],
        "code": "CANNOT_ASSESS",
        "text": "Prediction confidence too low for automatic triage. Routed to reviewer.",
        "tint": (65, 30, 25), "red_lesions": 7, "exudates": 2,
        "reason": "Borderline illumination - enhanced and re-assessed, still uncertain.",
    },
]


def build_report(case: dict, case_uuid: str) -> dict:
    quality_block = {
        "grade": case["quality"],
        "decision": {
            "A": "proceed", "B": "enhanced", "C": "recapture",
        }[case["quality"]],
        "reason": case.get("reason"),
        "features": {
            "focus_score": 0.91 if case["quality"] == "A" else (0.55 if case["quality"] == "B" else 0.18),
            "illumination_uniformity": 0.88 if case["quality"] != "C" else 0.30,
            "vessel_resolvability": 0.84 if case["quality"] == "A" else (0.5 if case["quality"] == "B" else 0.12),
            "field_coverage": 0.97,
            "contrast": 0.79 if case["quality"] != "C" else 0.35,
            "saturated_fraction": 0.002,
            "crushed_fraction": 0.001,
            "optic_disc_detectable": case["quality"] != "C",
            "macula_visible": case["quality"] != "C",
        },
    }

    prediction = None
    if case["ordinal"] is not None and not case["abstained"] and case["quality"] != "C":
        prediction = {
            "grade": case["grade"],
            "grade_label": case["label"],
            "ordinal": {
                "p_ge_1": case["ordinal"][0], "p_ge_2": case["ordinal"][1],
                "p_ge_3": case["ordinal"][2], "p_ge_4": case["ordinal"][3],
            },
            "referable": case["referable"],
            "referable_threshold": 0.41,
            "confidence": case["confidence"],
            "confidence_band": case["band"],
            "calibrated": True,
            "monotonicity_ok": True,
        }

    return {
        "schema_version": "1.0.0",
        "case_uuid": case_uuid,
        "patient_id": f"PSEUDO-{abs(hash(case_uuid)) % 100000:05d}",
        "laterality": random.choice(["OD", "OS"]),
        "laterality_source": "inferred",
        "captured_at": "2026-08-26T10:32:11Z",
        "device_id": "CAM-FIXTURE-01",
        "operator_id": "TECH-FIXTURE",
        "attempt_number": 1,
        "quality": quality_block,
        "prediction": prediction,
        "triage": {
            "level": case["triage"],
            "abstained": case["abstained"],
            "escalation_rules_fired": case["rules"],
        },
        "lesions": {
            "red_lesions": {
                "count": case["red_lesions"],
                "mean_probability": 0.71 if case["red_lesions"] else None,
                "within_1dd_of_fovea": min(4, case["red_lesions"]),
            },
            "hard_exudates": {
                "count": case["exudates"],
                "mean_probability": 0.78 if case["exudates"] else None,
            },
            "soft_exudates": {"count": 0, "mean_probability": None},
        },
        "anatomy": {
            "optic_disc": None if case["quality"] == "C" else {
                "cx": 341, "cy": 256, "radius_px": 65, "confidence": 0.93,
            },
            "fovea": None if case["quality"] == "C" else {
                "cx": 235, "cy": 268, "confidence": 0.81,
            },
            "disc_diameter_px": None if case["quality"] == "C" else 130,
            "geometry_selftest_passed": case["quality"] != "C",
        },
        "artifacts": {
            "thumb": "thumb.jpg",
            "review": "review_1536.jpg",
            "overlay_cam": None,
            "overlay_lesions": None,
            "original": None,
        },
        "limits": {
            "min_detectable_lesion_um": 45 if case["quality"] == "A" else (70 if case["quality"] == "B" else None),
            "not_assessed": ["neovascularisation", "diabetic_macular_oedema"],
        },
        "recommendation": {"code": case["code"], "text": case["text"]},
        "versions": {
            "model_version": "fixture-v0",
            "preprocessing_hash": "sha256:fixture",
            "dataset_version": "fixture",
            "pipeline_commit": "fixture",
        },
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []

    for i, case in enumerate(CASES):
        case_uuid = f"00000000-0000-4000-8000-{i:012d}"
        case_dir = OUT_DIR / case["name"]
        case_dir.mkdir(parents=True, exist_ok=True)

        report = build_report(case, case_uuid)
        (case_dir / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

        img = synth_fundus((768, 512), seed=i, tint=case["tint"])
        img.resize((256, 171)).save(case_dir / "thumb.jpg", quality=85)
        img.save(case_dir / "review_1536.jpg", quality=90)

        (case_dir / ".done").write_text("", encoding="utf-8")

        manifest.append({"name": case["name"], "case_uuid": case_uuid, "triage": case["triage"]})
        print(f"wrote {case_dir.relative_to(REPO_ROOT)}")

    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"\n{len(CASES)} fixture cases written to {OUT_DIR.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
