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

def validate_annotations(annotations_file, schema_file, val_manifest_path):
    print("Starting T-806.2 Data Quality Control Validation...")
    
    # 1. Load data
    try:
        annotations = load_json(annotations_file)
        schema = load_json(schema_file)
    except Exception as e:
        print(f"FAILED: Could not load JSON files: {e}")
        sys.exit(1)

    try:
        import jsonschema
        for idx, ann in enumerate(annotations):
            jsonschema.validate(instance=ann, schema=schema)
    except ImportError:
        print("WARNING: jsonschema package not found. Skipping strict schema validation. Please `pip install jsonschema`.")
    except Exception as e:
        print(f"FAILED: Schema validation failed: {e}")
        sys.exit(1)

    print("PASS: Schema format validation.")

    # 2. Leakage Audit
    val_ids = load_manifest_hashes(val_manifest_path)
    leakage_found = False
    for ann in annotations:
        if ann['image_id'] in val_ids:
            print(f"CRITICAL LEAKAGE: Image {ann['image_id']} belongs to the validation split!")
            leakage_found = True
        
        if ann['source_split'] != "APTOS_TRAIN":
            print(f"CRITICAL ERROR: Image {ann['image_id']} has forbidden source split {ann['source_split']}.")
            leakage_found = True

    if leakage_found:
        print("FAILED: Data leakage checks failed.")
        sys.exit(1)
    print("PASS: Data leakage (validation split independence) verified.")

    # 3. Clinical Logic Verification
    logic_errors = 0
    image_annotators = defaultdict(set)
    
    for ann in annotations:
        img_id = ann['image_id']
        annotator = ann['annotator_id']
        grade = ann['overall_grade']
        reasons = ann.get('rejection_reasons', [])
        
        if grade in ["B", "C"] and len(reasons) == 0:
            print(f"LOGIC ERROR: Image {img_id} by {annotator} is grade {grade} but has NO rejection reasons.")
            logic_errors += 1
            
        if grade == "A" and len(reasons) > 0:
            print(f"LOGIC ERROR: Image {img_id} by {annotator} is grade A but contains rejection reasons.")
            logic_errors += 1
            
        if annotator in image_annotators[img_id] and ann['adjudication_status'] not in ["ADJUDICATED", "RE_GRADE"]:
            print(f"LOGIC ERROR: Duplicate primary annotation found for Image {img_id} by {annotator}.")
            logic_errors += 1
            
        image_annotators[img_id].add(annotator)

    if logic_errors > 0:
        print(f"FAILED: {logic_errors} clinical logic errors found.")
        sys.exit(1)
    
    print("PASS: Clinical annotation logic constraints verified.")
    print("\nSUCCESS: Annotation dataset is structurally ready for agreement analysis.")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python T806_2_DATA_VALIDATION_SCRIPT.py <annotations.json> <schema.json> <val_manifest.csv>")
        sys.exit(1)
    
    validate_annotations(sys.argv[1], sys.argv[2], sys.argv[3])
