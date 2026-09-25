# RetinaGuard — Urgent Diagnostic & Optimization Prompt for Slow 701-Image Validation Run

## Mission

The 701-image labeled validation job is taking significantly longer than expected.

Do **not** continue waiting blindly.

Do **not** change the model, labels, preprocessing algorithm, class mapping, referable threshold, or evaluation cohort.

First determine whether the current job is:
- actively progressing
- stalled
- repeatedly failing/restarting
- blocked on OpenCV.js / WASM
- blocked on ONNX Runtime
- suffering from worker initialization overhead
- suffering from memory/CPU contention

Only after diagnosing the bottleneck should you optimize or safely restart the evaluator.

---

## 1. Inspect the Current Job First

Check the latest task log:

```powershell
Get-Content "C:/Users/knamd/.gemini/antigravity-ide/brain/14bacfe4-c534-4bdf-967d-cc3581a260b6/.system_generated/tasks/task-908.log" | Select-Object -Last 100
```

Check active Node processes:

```powershell
Get-Process node -ErrorAction SilentlyContinue |
    Select-Object Id,CPU,WorkingSet,StartTime,Path
```

Also inspect:

```powershell
Get-Process | Where-Object {$_.ProcessName -match "node|python"} |
    Select-Object ProcessName,Id,CPU,WorkingSet,StartTime
```

Determine:

```text
Is CPU increasing?
Is memory increasing?
Is the process alive?
Is output being written?
Is the process repeatedly restarting?
```

---

## 2. Check Actual Progress

Inspect the validation output directory and generated files.

Look for:

```text
node_batch_results.json
MODEL_PREDICTIONS.csv
CLINICAL_VALIDATION_REPORT.md
clinical_validation_results.json
worker output files
temporary result files
```

Check:
- file existence
- file size
- last modified time
- record count

Determine exactly:

```text
images started
images completed
images failed
images remaining
```

Do not infer progress from the existence of a file alone.

---

## 3. Add Explicit Progress Logging if Needed

If the evaluator does not expose progress, add incremental progress reporting:

```text
[1/701] image=...
[25/701] image=...
[50/701] image=...
...
[701/701] image=...
```

For each image or reasonable batch, record:

```text
index
image filename
elapsed time
preprocessing time
ONNX inference time
postprocessing time
total time
success/failure
```

Prefer structured JSONL or another append-only format so progress survives interruption.

Example:

```json
{
  "index": 25,
  "total": 701,
  "image": "example.png",
  "preprocessing_ms": 120,
  "onnx_ms": 85,
  "total_ms": 214,
  "status": "PASS"
}
```

---

## 4. Identify the Worker Architecture

Inspect:

```text
scripts/run_clinical_validation_parallel.js
src/inference/preprocess.js
src/inference/adapters/onnxAdapter.js
```

Determine whether every worker is repeatedly doing:

```text
create worker
→ initialize OpenCV.js / WASM
→ initialize ONNX Runtime
→ load ONNX model
→ process one image
→ destroy worker
```

If yes, identify that as a likely performance bottleneck.

Preferred architecture:

```text
start worker
→ initialize OpenCV once
→ initialize ONNX session once
→ load model once
→ process many images
→ terminate after assigned batch
```

Do not initialize heavyweight runtimes once per image.

---

## 5. Check Model / Session Initialization

Canonical model:

```text
retinaguard_resnet18.onnx
```

Expected SHA-256:

```text
C49E78C9B6C7BFA5B0098BD40A3901D02C7B41C9598CAC993891B29263476F3F
```

Verify the hash before proceeding.

Determine:

```text
How many times is the ONNX model loaded?
How many ONNX sessions are created?
How many OpenCV.js runtimes are initialized?
How many workers exist simultaneously?
```

Expected direction:

```text
model/session initialization = once per persistent worker
not once per image
```

Do not change the model artifact.

---

## 6. Check for Unexpected Serialization

Determine whether workers are blocked on:

```text
shared locks
single-threaded preprocessing
single-threaded filesystem writes
message-passing bottlenecks
OpenCV WASM initialization
ONNX session creation
large tensor serialization
```

Determine whether the current "parallel" evaluator is genuinely processing multiple images concurrently.

---

## 7. Check Memory Pressure

Measure:

```text
Node process memory
number of workers
estimated model memory
OpenCV/WASM memory
temporary tensor buffers
queued images
```

If memory is excessive, reduce the worker count.

Do not blindly increase worker count.

Use a small fixed pool; start around:

```text
2–4 persistent workers
```

unless measurement shows more is appropriate.

---

## 8. Check Single-Image Performance

Before running all 701 images, measure one representative image through the actual evaluation path.

Measure:

```text
preprocessing_ms
ONNX_session_init_ms
ONNX_inference_ms
postprocessing_ms
total_ms
```

Then run at least 5 images and calculate:

```text
min
median
P95
max
```

Identify whether the bottleneck is:

```text
preprocessing
ONNX inference
initialization
filesystem
worker coordination
```

---

## 9. Do Not Restart Immediately

If the current task is making measurable progress:

```text
CONTINUE
```

Do not kill a healthy run just to optimize it.

If progress has stopped and the process is genuinely stalled:

```text
STOP CLEANLY
```

Preserve:

```text
completed image IDs
failed image IDs
partial outputs
logs
timings
```

Do not discard partial results.

---

## 10. Make the Evaluator Resumable

If the current evaluator cannot resume, modify it so that it can.

Maintain durable state:

```json
{
  "completed": [],
  "failed": [],
  "remaining": []
}
```

Before processing an image:

```text
if valid result already exists:
    skip it
else:
    process it
```

Do not restart all 701 images unnecessarily.

---

## 11. Add Per-Image Failure Isolation

One bad image must not block the entire validation run.

Record failures like:

```json
{
  "image": "example.png",
  "status": "FAILED",
  "error": "...",
  "stage": "preprocessing|onnx|postprocessing|io"
}
```

Continue processing the remaining images.

Never replace failures with fabricated predictions.

---

## 12. Optimize Only After Diagnosis

Apply the smallest justified optimization.

Preferred order:

```text
1. Reuse ONNX session
2. Reuse OpenCV.js runtime
3. Use persistent workers
4. Reduce unnecessary tensor/file serialization
5. Use small measured worker pool
6. Write incremental results instead of one huge in-memory array
7. Add resume support
```

Do not:

```text
change preprocessing algorithms
change interpolation
change normalization
change model
change labels
change validation cohort
change inference semantics
```

Performance optimization must not alter validation semantics.

---

## 13. Benchmark Before and After

Capture before and after:

```text
images processed
total elapsed time
average image time
median image time
P95 image time
worker count
CPU
memory
```

Do not claim improvement without measurements.

---

## 14. Validation Correctness Check After Optimization

After any optimization, compare a fixed deterministic sample against the previous implementation.

Use at least:

```text
10 images
```

Compare:

```text
preprocessed tensor
logits
probabilities
predicted grade
referable probability
referable flag
```

Expected:

```text
no material semantic change
```

If outputs change materially:

```text
STOP
```

and investigate before continuing the 701-image evaluation.

---

## 15. Final 701-Image Run

Once the evaluator is healthy:

```text
run all 701 images
```

Produce incremental progress and final outputs.

At completion verify:

```text
expected images = 701
evaluated = 701
successful = 701 - documented failures
failed = documented failures
```

Do not call the evaluation complete if images were skipped or failed without explicit reporting.

---

## 16. Final Metrics Check

After completion verify:

```text
confusion matrix
accuracy
per-class precision
per-class recall
per-class F1
macro F1
weighted F1
QWK if correctly implemented

referable TP
referable TN
referable FP
referable FN
sensitivity
specificity
PPV
NPV
F1
```

Also report:

```text
ground-truth class distribution
prediction class distribution
referable ground-truth distribution
referable prediction distribution
```

Do not report a metric without its denominator and evaluation population.

---

## 17. Final Response Format

At completion report:

```text
CURRENT STATUS:
RUNNING / STALLED / FAILED / COMPLETED

PROGRESS:
X / 701

PROCESSED:
X

FAILED:
X

ELAPSED:
...

AVERAGE IMAGE TIME:
...

MEDIAN IMAGE TIME:
...

P95 IMAGE TIME:
...

WORKER COUNT:
...

MODEL SESSION INITIALIZATIONS:
...

OPENCV INITIALIZATIONS:
...

CPU:
...

MEMORY:
...

PRIMARY BOTTLENECK:
...

OPTIMIZATION:
<what changed, if anything>

OUTPUT CONSISTENCY:
PASS / FAIL

FINAL VALIDATION RUN:
COMPLETE / INCOMPLETE

EVIDENCE FILES:
<paths>

NEXT STATUS:
READY FOR METRIC REVIEW / BLOCKED
```

---

## 18. Critical Rules

Do not say:

```text
"it is still running, so let's wait"
```

without reporting measurable progress.

Do not kill a healthy process without diagnosing it.

Do not optimize without identifying the bottleneck.

Do not change validation semantics for speed.

The goal is:

```text
FAST ENOUGH
+
REPRODUCIBLE
+
RESUMABLE
+
MEMORY SAFE
+
NO CHANGE TO MODEL/INPUT SEMANTICS
```

Only after the 701-image evaluation completes successfully should the model-performance metrics be reviewed and frozen as evidence.
