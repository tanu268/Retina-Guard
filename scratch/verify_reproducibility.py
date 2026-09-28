import csv
import random

def sample_cohort():
    records = []
    with open('T806_3_4_LOCAL_DATASET_MANIFEST.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['source_split'] == 'APTOS_TRAIN':
                records.append(row)
                
    strata = {'0': [], '1': [], '2': [], '3': [], '4': []}
    for r in records:
        strata[r['DR grade']].append(r)
        
    for k in strata:
        strata[k].sort(key=lambda x: x['image_id'])
        
    random.seed("T806_RG_2026")
    cohort = []
    cohort.extend(random.sample(strata['0'], 150))
    cohort.extend(random.sample(strata['1'], 50))
    cohort.extend(random.sample(strata['2'], 150))
    cohort.extend(random.sample(strata['3'], 75))
    cohort.extend(random.sample(strata['4'], 75))
    
    return [c['image_id'] for c in cohort]

def main():
    try:
        cohort1 = sample_cohort()
        cohort2 = sample_cohort()
        if cohort1 == cohort2:
            print("PASS")
        else:
            print("FAIL")
    except Exception as e:
        print("FAIL", e)

if __name__ == '__main__':
    main()
