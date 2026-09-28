import csv
import hashlib
import os
import json
import random
from PIL import Image

TRAIN_MANIFEST = 'model/datasets/train_manifest.csv'
VAL_MANIFEST = 'model/datasets/val_manifest.csv'
IMAGE_DIR = 'data/aptos2019/train_images'

def sha256_file(filepath):
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256.update(chunk)
    return sha256.hexdigest()

def process_manifest(manifest_path, split_name, expected_hash_map, global_hash_map, overlap_set):
    records = []
    missing = 0
    decode_failures = 0
    
    with open(manifest_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            image_id = row['id_code']
            diagnosis = row['diagnosis']
            expected_hash = row['image_hash']
            
            filepath = os.path.join(IMAGE_DIR, f"{image_id}.png")
            if not os.path.exists(filepath):
                missing += 1
                continue
                
            actual_hash = sha256_file(filepath)
            size = os.path.getsize(filepath)
            
            width = height = 0
            decode_status = "PASS"
            try:
                with Image.open(filepath) as img:
                    img.verify()
                with Image.open(filepath) as img:
                    width, height = img.size
            except Exception:
                decode_status = "FAIL"
                decode_failures += 1
                
            if actual_hash in global_hash_map:
                if global_hash_map[actual_hash] != split_name:
                    overlap_set.add(actual_hash)
            global_hash_map[actual_hash] = split_name
            
            records.append({
                'image_id': image_id,
                'source_split': split_name,
                'original_manifest_path': manifest_path,
                'local_image_path': filepath,
                'DR grade': diagnosis,
                'SHA-256': actual_hash,
                'file_size_bytes': size,
                'width': width,
                'height': height,
                'decode_status': decode_status,
                'expected_hash': expected_hash
            })
    return records, missing, decode_failures

def main():
    global_hash_map = {}
    overlap_set = set()
    
    print("Processing train manifest...")
    train_records, train_missing, train_dec_fail = process_manifest(TRAIN_MANIFEST, 'APTOS_TRAIN', {}, global_hash_map, overlap_set)
    print("Processing val manifest...")
    val_records, val_missing, val_dec_fail = process_manifest(VAL_MANIFEST, 'APTOS_VAL', {}, global_hash_map, overlap_set)
    
    # Check duplicates in train
    train_hashes = [r['SHA-256'] for r in train_records]
    train_dups = len(train_hashes) - len(set(train_hashes))
    
    # Save local dataset manifest
    with open('T806_3_4_LOCAL_DATASET_MANIFEST.csv', 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['image_id', 'source_split', 'original_manifest_path', 'local_image_path', 'DR grade', 'SHA-256', 'file_size_bytes', 'width', 'height', 'decode_status'])
        writer.writeheader()
        for r in train_records + val_records:
            w_dict = r.copy()
            del w_dict['expected_hash']
            writer.writerow(w_dict)
            
    # Print stats
    print(f"Train expected: 2803, resolved: {len(train_records)}, missing: {train_missing}, decode_failures: {train_dec_fail}")
    print(f"Train Duplicates (internal): {train_dups}")
    print(f"Train/Val overlaps: {len(overlap_set)}")
    
    if len(overlap_set) > 0 or train_missing > 0 or train_dec_fail > 0:
        print("STOP: Validation failed")
        return
        
    # Cohort sampling
    # Grade distribution: Grade 0: 150, Grade 1: 50, Grade 2: 150, Grade 3: 75, Grade 4: 75
    random.seed("T806_RG_2026")
    
    strata = {'0': [], '1': [], '2': [], '3': [], '4': []}
    for r in train_records:
        strata[r['DR grade']].append(r)
        
    # Sort for deterministic sampling just in case
    for k in strata:
        strata[k].sort(key=lambda x: x['image_id'])
        
    cohort = []
    cohort.extend(random.sample(strata['0'], 150))
    cohort.extend(random.sample(strata['1'], 50))
    cohort.extend(random.sample(strata['2'], 150))
    cohort.extend(random.sample(strata['3'], 75))
    cohort.extend(random.sample(strata['4'], 75))
    
    # Exclude fixtures? None known except idrid masks earlier, but aptos has no known test fixtures.
    
    # Save Internal Cohort
    with open('T806_3_4_INTERNAL_COHORT_MANIFEST.csv', 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['image_id', 'image_hash', 'source_split', 'DR grade', 'local_image_path', 'sampling_seed', 'cohort_version'])
        writer.writeheader()
        for c in cohort:
            writer.writerow({
                'image_id': c['image_id'],
                'image_hash': c['SHA-256'],
                'source_split': c['source_split'],
                'DR grade': c['DR grade'],
                'local_image_path': c['local_image_path'],
                'sampling_seed': 'T806_RG_2026',
                'cohort_version': '1.0'
            })
            
    # Save Blinded Cohort
    with open('T806_3_4_BLINDED_ANNOTATOR_MANIFEST.csv', 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['image_id', 'image_hash', 'source_split'])
        writer.writeheader()
        for c in cohort:
            writer.writerow({
                'image_id': c['image_id'],
                'image_hash': c['SHA-256'],
                'source_split': c['source_split']
            })
            
    print("Cohorts generated successfully.")

if __name__ == '__main__':
    main()
