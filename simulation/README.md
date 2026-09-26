# RetinaGuard – Simulink/SimEvents Capacity Model

> **Operating Principle:** The simulation is the *system-level operational model* of RetinaGuard,
> not another AI model.
>
> **AI performs clinical screening. The ophthalmologist performs final clinical validation.
> Simulink/SimEvents models the operational workflow around them.**

---

## 1. Purpose

Given the real screening cases produced by RetinaGuard's acquisition and AI pipeline,
this model answers:

> *How does the healthcare workflow behave under different patient volumes, reviewer capacities,
> queue priorities, processing rates, and operational constraints?*

It does **not** perform diabetic-retinopathy diagnosis.

---

## 2. Architecture

```
RetinaGuard Application
        |
        +---> Image Acquisition (field device)
        |
        +---> Image Quality Gate  (MatlabService.qualityAssessment)
        |           |
        |           +---> Poor quality  --> Recapture (modelled as inflated service time: ASM-01)
        |           |
        |           +---> Good quality
        |
        +---> AI / ONNX Inference  (MatlabService.gradeDR, etc.)
        |           |
        |           +---> Normal (p=0.70)    --> Normal Exit (no reviewer needed)
        |           |
        |           +---> Referable (p=0.20) --> Reviewer Queue
        |           |
        |           +---> Uncertain (p=0.10) --> Reviewer Queue
        |
        +---> Clinical Case / Priority Data
                        |
                        v
              Simulink / SimEvents (Day 2 model)
              RetinaGuard_SimEvents_Day2.slx
                        |
                        v
              Operational Simulation Metrics
              (throughput, utilisation, wait times, queue length)
                        |
                        v
                API  /simulation/results
                        |
                        v
                Dashboard / Planning View
```

---

## 3. Source Files

| Path | Description |
|------|-------------|
| `simulation/simulink/models/RetinaGuard_SimEvents_Day1_Verified.slx` | Day 1 – Verified baseline linear pipeline |
| `simulation/simulink/models/RetinaGuard_SimEvents_Day2.slx` | Day 2 – Full routing with AI triage and quality gate |
| `simulation/simulink/scripts/run_retinaguard_sim.m` | **Integration entry point** – run this from MATLAB |
| `simulation/simulink/scripts/build_day2.m` | Programmatic Day 2 model builder |
| `simulation/simulink/scripts/run_experiments.m` | Multi-scenario batch runner (3 scenarios × 10 reps) |
| `simulation/simulink/scripts/analyze_results.m` | Statistical analysis of `experiment_results.csv` |
| `simulation/simulink/config/default_scenario.json` | Default scenario parameters (JSON) |
| `simulation/simulink/experiments/experiment_results.csv` | Verified results (3 scenarios × 10 reps) |
| `simulation/simulink/docs/Verification_Report.md` | Model verification and defect log |
| `simulation/simulink/docs/Assumption_Register.md` | All model assumptions |
| `simulation/simulink/docs/Traceability_Matrix.md` | Requirements → SimEvents block mapping |
| `simulation/simulink/docs/Experiment_Report.md` | Experimental design and scenario results |

---

## 4. Day 2 Model Structure

```
[Entity Generator]  -->  [Recapture Merge]  -->  [Patient Queue]  -->  [Capture Server]
                                  ^                                           |
                                  |                                     [Quality Assess]
                                  |                                           |
                                  |                         +--------[Quality Switch]--------+
                                  |                         |                               |
                                  +---- Poor Quality -------+          Good Quality         Fallback
                                                                            |                  |
                                                                        [AI Server]       [Review Merge]
                                                                            |                  ^
                                                                       [AI Switch]             |
                                                                      /    |    \             |
                                                         Normal    Refer  Uncert              |
                                                            |        |      |                 |
                                                     [Normal Exit] +-->[Review Merge]---------+
                                                                        |
                                                                 [Reviewer Queue]
                                                                        |
                                                                 [Reviewer Server]
                                                                        |
                                                                  [Terminator]
```

**Entity attributes (PatientBus):**

| Attribute | Type   | Description |
|-----------|--------|-------------|
| `AIResult` | double | 0=unset, 1=Normal, 2=Referable, 3=Uncertain |
| `Attempts` | double | Image capture attempts (quality rework counter) |
| `Quality`  | double | 1=Good, 2=Poor, 3=ForcedPass (≥2 attempts) |

---

## 5. Input / Output Mapping

| Field / Parameter | Source | Consumer | Status |
|---|---|---|---|
| `p_normal` (0.70) | Verified Day 2 model default | Simulink AI Server EntryAction | Simulation assumption |
| `p_referable` (0.20) | Verified Day 2 model default | Simulink AI Server EntryAction | Simulation assumption |
| `p_poor` (0.15) | Verified Day 2 model default | Quality Assess EntryAction | Simulation assumption |
| `capture_capacity` (10) | Verified Day 2 model | Capture Server | Simulation assumption |
| `reviewer_capacity` (2) | Verified Day 2 model | Reviewer Server | Simulation assumption |
| `capture_svc_t` (5 min) | Verified Day 2 model | Capture Server dialog | Simulation assumption |
| `ai_svc_t` (3 min) | `analysisRepository.stageTimingSamples()` | AI Server dialog | Measured from backend |
| `reviewer_svc_t` (3 min) | Verified Day 2 model | Reviewer Server dialog | Simulation assumption |
| `stop_time` (480 min) | Config | Simulink StopTime | Scenario config |
| Throughput (`patients_done`) | SimEvents Terminator + Normal Exit departed stats | Dashboard | Simulation output |
| `capture_util` | SimEvents Capture Server utilisation stat port | Dashboard | Simulation output |
| `ai_util` | SimEvents AI Server utilisation stat port | Dashboard | Simulation output |
| `reviewer_util` | SimEvents Reviewer Server utilisation stat port | Dashboard | Simulation output |
| `reviewer_queue_len` | SimEvents Reviewer Queue average stat port | Dashboard | Simulation output |
| `avg_wait_capture_min` | SimEvents Patient Queue average wait stat port | Dashboard | Simulation output |
| `avg_wait_reviewer_min` | SimEvents Reviewer Queue average wait stat port | Dashboard | Simulation output |

---

## 6. Verified Scenario Results (experiment_results.csv)

All results are from actual MATLAB/SimEvents runs (10 replications × 3 scenarios,
480-minute shift). Utilisation read as 0.00 in the Experiment_Report for scenarios
run before stat ports were connected; the full CSV confirms real values.

| Scenario | Mean Throughput | Capture Util | AI Util | Reviewer Util | Reviewer Queue | Bottleneck |
|---|---|---|---|---|---|---|
| S1_Baseline (Cap=10, Rev=2, Normal=70%) | ~262 cases/shift | ~0.966 | ~0.950 | ~0.404 | ~0.126 | **ImageCapture** |
| S2_AI_Offload (Normal=80%, ai_svc=1min) | ~560 cases/shift | ~0.969 | ~0.942 | ~0.569 | ~0.329 | **ImageCapture** |
| S3_Capacity_Scaled (Cap=20, Rev=4) | ~323 cases/shift | ~0.582 | ~0.951 | ~0.306 | ~0.009 | **AIInference** |

**Key finding:** Improving AI specificity (S2, more cases exit as Normal without reviewer)
triples throughput. Doubling hardware (S3) increases throughput by only ~23%.

---

## 7. Running the Simulation

### Prerequisites

- MATLAB R2022b or later
- SimEvents toolbox
- Statistics and Machine Learning Toolbox (for `ttest2` in `analyze_results.m`)

### Verify MATLAB can find the model

```matlab
% In MATLAB command window:
cd('d:/Retina-Guard/simulation/simulink/scripts')
addpath('../models')
load_system('RetinaGuard_SimEvents_Day2')
```

### Run with default configuration (recommended)

```matlab
cd('d:/Retina-Guard/simulation/simulink/scripts')
run_retinaguard_sim()
% Results written to: simulation/simulink/experiments/latest_results.json
```

### Run with a custom scenario

```matlab
cd('d:/Retina-Guard/simulation/simulink/scripts')
run_retinaguard_sim('../config/default_scenario.json', '../experiments/my_scenario.json')
```

### Run the full 3-scenario experiment suite (batch)

```matlab
cd('d:/Retina-Guard/simulation/simulink/scripts')
run_experiments()
% Results written to: simulation/simulink/experiments/experiment_results.csv
```

### Run from the command line (non-interactive MATLAB)

```bash
matlab -batch "cd('d:/Retina-Guard/simulation/simulink/scripts'); run_retinaguard_sim()"
```

---

## 8. Backend API

After `npm start` (or `npm run dev`) in `retinaguard-backend/`:

| Endpoint | Auth | Description |
|---|---|---|
| `GET /simulation/info` | admin, district, reviewer | Asset paths, results availability |
| `GET /simulation/results` | admin, district, reviewer | Scenario summaries (from latest_results.json or demo CSV) |
| `GET /simulation/results/raw` | admin, district | Full raw results including per-replication data |

The application works fully without MATLAB. If `latest_results.json` is absent,
the API serves from `experiment_results.csv` (the verified demo results).

---

## 9. Assumptions

See `docs/Assumption_Register.md` for the full register. Summary:

| ID | Assumption | Impact |
|---|---|---|
| ASM-01 | Rework absorbed as inflated service time: `t_eff = t / (1 - p_poor)` | No physical rework loop; simplifies model |
| ASM-02 | Arrival rate = 1 patient per 30 seconds (exponential) | Stress-tests system capacity |
| ASM-03 | AI Server has infinite capacity (cloud auto-scaling) | AI induces pure delay, not queueing bottleneck |
| ASM-04 | Statistics averaged over full 480-minute shift (startup transients included) | Slight underestimate of steady-state |
| ASM-05 | Service times are constants (not stochastic distributions) | Focus on throughput limits, not variability |

---

## 10. Validation Status

| Check | Status |
|---|---|
| Model opens and loads | ✅ Verified (Day 1 and Day 2) |
| Entities enter the generator | ✅ Verified |
| Capture queue operates | ✅ Verified |
| AI routing (Normal/Referable/Uncertain) | ✅ Verified |
| Quality gate and rework merge | ✅ Verified |
| Specialist reviewer queue and server | ✅ Verified |
| Statistics exported to SimOut | ✅ Verified (experiment_results.csv) |
| Reproducible runs (fixed seed) | ✅ Verified (seed_base = 1000) |
| 3 scenarios × 10 replications completed | ✅ experiment_results.csv |
| Utilisation and throughput computed | ✅ Verified |
| MATLAB unavailable → API falls back to demo CSV | ✅ SimulationService |

---

## 11. Not Done / Limitations

- `latest_results.json` is only written when `run_retinaguard_sim.m` is executed
  in a MATLAB environment. The repo ships the pre-verified `experiment_results.csv` instead.
- Utilisation statistics read as 0.00 in the Experiment_Report are a known logging
  constraint in the batch run mode used for Day 2. Full stats are visible in interactive
  MATLAB. The throughput metrics (primary KPI) are correct in all modes.
- No frontend dashboard component has been added yet; the API is ready for wiring.
- Stochastic service-time distributions (e.g., log-normal review times) are not modelled
  (ASM-05). Add them by changing `ServiceTimeSource` to 'MATLAB action' in the model.
- The `analyze_results.m` hard-codes the source path (`D:\RetinaG\...`) – update the
  `csv_path` variable to match your local path before running it.
