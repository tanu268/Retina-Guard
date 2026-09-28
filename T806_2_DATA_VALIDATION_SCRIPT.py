#!/usr/bin/env python3
import json
import csv
import sys
import os
from collections import defaultdict

def load_json(filepath):
    with open(filepath, 'r') as f:
        return json.load(f)

def load_manifest_hashes(manifest_path):
    hashes = set()
    if os.path.exists(manifest_path):
        with open(manifest_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if 'image_hash' in row:
                    hashes.add(row['image_hash'])
                elif 'id_code' in row:
                    hashes.add(row['id_code'])
    return hashes

def validate_annotations(annotations_file, schema_file, val_manifest_path=None):
    print("Starting T-806.2.1 Data Quality Control Validation...")
    
    # 1. Load data
    try:
        annotations = load_json(annotations_file)
        schema = load_json(schema_file)
    except Exception as e:
        print(f"FAILED: Could not load JSON files: {e}")
        sys.exit(1)

    # 2. Schema Validation
    try:
        import jsonschema
        for idx, ann in enumerate(annotations):
            jsonschema.validate(instance=ann, schema=schema)
    except ImportError:
        print("WARNING: jsonschema package not found. Skipping strict schema validation. Please `pip install jsonschema`.")
        sys.exit(1)
    except Exception as e:
        print(f"FAILED: Schema validation failed: {e}")
        sys.exit(1)

    print("PASS: Schema format validation.")

    # 3. Leakage Audit
    if val_manifest_path and os.path.exists(val_manifest_path):
        val_ids = load_manifest_hashes(val_manifest_path)
        leakage_found = False
        for ann in annotations:
            if ann['image_id'] in val_ids:
                print(f"CRITICAL LEAKAGE: Image {ann['image_id']} belongs to the validation split!")
                leakage_found = True
        if leakage_found:
            print("FAILED: Data leakage checks failed.")
            sys.exit(1)
        print("PASS: Data leakage (validation split independence) verified.")
    else:
        print("NOT VERIFIABLE: Validation manifest not provided or not found. Cannot verify test leakage.")

    # 4. Clinical Logic & Known-Good Verification
    logic_errors = 0
    image_annotators = defaultdict(set)
    
    for ann in annotations:
        img_id = ann['image_id']
        annotator = ann['annotator_id']
        grade = ann['overall_grade']
        status = ann['adjudication_status']
        reasons = ann.get('rejection_reasons', [])
        dims = ann.get('dimensions', {})
        
        # Split Check
        if ann['source_split'] != "APTOS_TRAIN":
            print(f"LOGIC ERROR: Image {img_id} has forbidden source split {ann['source_split']}.")
            logic_errors += 1

        # Reason logic
        if grade in ["B", "C"] and len(reasons) == 0:
            print(f"LOGIC ERROR: Image {img_id} by {annotator} is grade {grade} but has NO rejection reasons.")
            logic_errors += 1
            
        if grade == "A" and len(reasons) > 0:
            print(f"LOGIC ERROR: Image {img_id} by {annotator} is grade A but contains rejection reasons.")
            logic_errors += 1
            
        if annotator in image_annotators[img_id] and status not in ["ADJUDICATED", "RE_GRADE"]:
            print(f"LOGIC ERROR: Duplicate primary annotation found for Image {img_id} by {annotator}.")
            logic_errors += 1
            
        image_annotators[img_id].add(annotator)
        
        # Adjudication reason check (also enforced by JSON schema)
        if status == "ADJUDICATED" and "adjudication_reason" not in ann:
            print(f"LOGIC ERROR: Image {img_id} is ADJUDICATED but missing adjudication_reason.")
            logic_errors += 1
            
        # Known-Good rules: No UNCERTAIN allowed anywhere if claiming known-good status implicitly by A
        has_uncertain = grade == "UNCERTAIN" or "UNCERTAIN" in dims.values()
        if grade == "A" and has_uncertain:
            print(f"LOGIC ERROR: Image {img_id} graded A but contains UNCERTAIN dimensions. Cannot be known-good.")
            logic_errors += 1

    if logic_errors > 0:
        print(f"FAILED: {logic_errors} clinical logic errors found.")
        sys.exit(1)
    
    print("PASS: Clinical annotation logic constraints verified.")
    print("\nSUCCESS: Annotation dataset is structurally ready for agreement analysis.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python T806_2_DATA_VALIDATION_SCRIPT.py <annotations.json> <schema.json> [val_manifest.csv]")
        sys.exit(1)
    
    val_man = sys.argv[3] if len(sys.argv) > 3 else None
    validate_annotations(sys.argv[1], sys.argv[2], val_man)
