# Model Class Mapping Forensics

| Model Index | Backend Grade | Clinical Label | Evidence |
|---:|---:|---|---|
| 0 | 0 | No Apparent DR | Verified from `dataset.py` (labels 0-4) and `contracts.js` (code 0) |
| 1 | 1 | Mild NPDR | Verified from `dataset.py` (labels 0-4) and `contracts.js` (code 1) |
| 2 | 2 | Moderate NPDR | Verified from `dataset.py` (labels 0-4) and `contracts.js` (code 2) |
| 3 | 3 | Severe NPDR | Verified from `dataset.py` (labels 0-4) and `contracts.js` (code 3) |
| 4 | 4 | PDR | Verified from `dataset.py` (labels 0-4) and `contracts.js` (code 4) |

The training pipeline uses an integer mapping in `dataset.py`:
`label = int(self.dataframe.iloc[index]["diagnosis"])`
where diagnosis in `train_manifest.csv` is known to map exactly to the 5 standard ICDR classes.
The backend severity codes in `src/matlab/contracts.js` perfectly match these classes (0 to 4).
