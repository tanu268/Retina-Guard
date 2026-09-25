# Python Environment Forensic

**Repository root**: `D:\Retina-Guard`
**Python source root**: `D:\Retina-Guard\model\RetinaGuard_ML`
**Preprocessing module path**: `D:\Retina-Guard\model\RetinaGuard_ML\src\preprocessing.py`
**Current import statements**: `from src.preprocessing import retina_guard_baseline_preprocess`
**Dependency manifests**: None explicitly present for inference/preprocessing (only `package.json` for Node backend, and `setup.py` for node-gyp).
**Python version**: Python 3.13.3 (global)
**Expected virtual environment**: `D:\Retina-Guard\.venv`
**Current interpreter**: `C:\Python313\python.exe` (initially), changing to `.\.venv\Scripts\python.exe`
**Execution commands**: `python scripts/verify_preprocessing.py <image_path>`
**Working directory assumptions**: `D:\Retina-Guard\retinaguard-backend` or `D:\Retina-Guard` (sys.path manipulation uses absolute paths in the script).
