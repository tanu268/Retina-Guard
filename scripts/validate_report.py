#!/usr/bin/env python3
"""Validate a report.json against schemas/report.schema.json.

Usage:
    python scripts/validate_report.py path/to/report.json [more.json ...]
    python scripts/validate_report.py fixtures/cases/*/report.json

Exits non-zero if any file fails validation.
"""
import json
import sys
from pathlib import Path

try:
    import jsonschema
except ImportError:
    print("Missing dependency. Install with: pip install jsonschema", file=sys.stderr)
    sys.exit(2)

REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = REPO_ROOT / "schemas" / "report.schema.json"


def load_schema() -> dict:
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        return json.load(f)


def check_referable_consistency(report: dict) -> list[str]:
    """Cross-field rules the JSON Schema itself cannot express."""
    errors = []
    pred = report.get("prediction")
    if pred is None:
        return errors

    p_ge_2 = pred["ordinal"]["p_ge_2"]
    threshold = pred["referable_threshold"]
    expected = p_ge_2 > threshold
    if pred["referable"] != expected:
        errors.append(
            f"prediction.referable={pred['referable']} but p_ge_2={p_ge_2} "
            f"vs threshold={threshold} implies referable={expected}"
        )

    ordinal = pred["ordinal"]
    ordered = [ordinal["p_ge_1"], ordinal["p_ge_2"], ordinal["p_ge_3"], ordinal["p_ge_4"]]
    is_monotonic = all(ordered[i] >= ordered[i + 1] for i in range(len(ordered) - 1))
    if pred["monotonicity_ok"] != is_monotonic:
        errors.append(
            f"prediction.monotonicity_ok={pred['monotonicity_ok']} but ordinal values "
            f"{ordered} are {'monotonic' if is_monotonic else 'NOT monotonic'}"
        )

    return errors


def check_quality_prediction_link(report: dict) -> list[str]:
    """Grade-C or abstained cases must not carry a prediction."""
    errors = []
    grade = report["quality"]["grade"]
    triage_level = report["triage"]["level"]
    pred = report.get("prediction")

    if grade == "C" and pred is not None:
        errors.append("quality.grade is C but prediction is not null — Grade C must never be graded")

    if report["triage"]["abstained"] and pred is not None:
        errors.append("triage.abstained is true but prediction is not null")

    if grade == "C" and triage_level != "P0":
        errors.append(f"quality.grade is C but triage.level is {triage_level!r}, expected P0")

    return errors


def validate_file(path: Path, schema: dict) -> list[str]:
    try:
        with open(path, encoding="utf-8") as f:
            report = json.load(f)
    except json.JSONDecodeError as e:
        return [f"invalid JSON: {e}"]

    validator = jsonschema.Draft7Validator(schema)
    errors = [f"{'.'.join(str(p) for p in e.path)}: {e.message}" for e in validator.iter_errors(report)]

    if not errors:
        errors.extend(check_referable_consistency(report))
        errors.extend(check_quality_prediction_link(report))

    return errors


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2

    schema = load_schema()
    failed = 0

    for arg in sys.argv[1:]:
        path = Path(arg)
        if not path.exists():
            print(f"FAIL {path}: file not found")
            failed += 1
            continue

        errors = validate_file(path, schema)
        if errors:
            print(f"FAIL {path}")
            for err in errors:
                print(f"  - {err}")
            failed += 1
        else:
            print(f"OK   {path}")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
