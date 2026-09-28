'use strict';

/**
 * simulation.service.js
 *
 * Provides access to RetinaGuard SimEvents capacity-planning simulation results,
 * and can trigger a live MATLAB/SimEvents execution.
 *
 * Working approach (verified 2026-09-28):
 *   - MATLAB cwd must be D:\RetinaGuard_SimEvents\scripts (all Simulink caches live there)
 *   - load_system / sim() succeed from that cwd
 *   - Config is read from repo; output is written to repo's latest_results.json
 *   - We generate a small wrapper .m script in %TEMP% that overrides models_dir
 *     to D:\RetinaGuard_SimEvents\models, then delegates to run_retinaguard_sim()
 *     for all stat extraction + JSON writing.
 *
 * Result source labels:
 *   'live-matlab'    - fresh output from a just-completed MATLAB run
 *   'latest_results' - a previous MATLAB run persisted to disk
 *   'demo_csv'       - precomputed experiment_results.csv (no live MATLAB)
 */

const path      = require('path');
const fs        = require('fs');
const os        = require('os');
const { spawn } = require('child_process');

// ── Paths ─────────────────────────────────────────────────────────────────────
// 4 x '..' from src/modules/simulation → repo root
const REPO_ROOT    = path.resolve(__dirname, '..', '..', '..', '..');
const SIM_ROOT     = path.join(REPO_ROOT, 'simulation', 'simulink');
const RESULTS_FILE = path.join(SIM_ROOT, 'experiments', 'latest_results.json');
const DEMO_CSV     = path.join(SIM_ROOT, 'experiments', 'experiment_results.csv');
const REPO_SCRIPTS = path.join(SIM_ROOT, 'scripts');
const REPO_CFG     = path.join(SIM_ROOT, 'config', 'default_scenario.json');

// D-drive: where Simulink caches (slprj, slxc) are valid — cwd must be here
const DDIR_SCRIPTS = 'D:/RetinaGuard_SimEvents/scripts';
const DDIR_MODELS  = 'D:/RetinaGuard_SimEvents/models';

// ── Concurrent-run guard ──────────────────────────────────────────────────────
let _simulationRunning = false;

// ── CSV fallback parser ───────────────────────────────────────────────────────
function parseDemoCsv() {
  if (!fs.existsSync(DEMO_CSV)) return null;
  const raw    = fs.readFileSync(DEMO_CSV, 'utf8');
  const lines  = raw.trim().split('\n').filter(Boolean);
  const header = lines[0].split(',');
  const rows   = lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj  = {};
    header.forEach((h, i) => {
      obj[h.trim()] = isNaN(vals[i]) ? vals[i].trim() : parseFloat(vals[i]);
    });
    return obj;
  });
  const scenarioMap = {};
  rows.forEach(r => {
    if (!scenarioMap[r.scenario]) scenarioMap[r.scenario] = [];
    scenarioMap[r.scenario].push(r);
  });
  const scenarios = Object.entries(scenarioMap).map(([name, reps]) => {
    const mean       = key => reps.reduce((s, r) => s + (r[key] || 0), 0) / reps.length;
    const utils      = [mean('capture_util'), mean('ai_util'), mean('reviewer_util')];
    const labels     = ['ImageCapture', 'AIInference', 'SpecialistReview'];
    const bottleneck = labels[utils.indexOf(Math.max(...utils))];
    return {
      name, replications: reps,
      summary: {
        mean_patients_done:      mean('patients_done'),
        mean_capture_util:       mean('capture_util'),
        mean_ai_util:            mean('ai_util'),
        mean_reviewer_util:      mean('reviewer_util'),
        mean_reviewer_queue_len: mean('reviewer_queue_len'),
        mean_wait_capture_min:   mean('avg_wait_capture'),
        mean_wait_reviewer_min:  mean('avg_wait_reviewer'),
      },
      bottleneck,
    };
  });
  return { scenarios, source: 'demo_csv', generated_at: null };
}

// ── Public API ────────────────────────────────────────────────────────────────
class SimulationService {
  getLatestResults() {
    if (fs.existsSync(RESULTS_FILE)) {
      try {
        const data = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
        data.source = data.source || 'latest_results';
        return data;
      } catch (_) { /* fall through */ }
    }
    const demo = parseDemoCsv();
    if (demo) return demo;
    return null;
  }

  getSummaries() {
    const data = this.getLatestResults();
    if (!data) return [];
    // New format from run_retinaguard_sim: { scenario, summary, bottleneck, ... }
    if (data.scenario && data.summary) {
      return [{
        name:               data.scenario,
        stop_time_min:      data.stop_time_min,
        n_replications:     data.n_replications,
        bottleneck:         data.bottleneck,
        source:             data.source,
        generated_at:       data.generated_at || null,
        ...data.summary,
      }];
    }
    // CSV fallback format: { scenarios: [...] }
    if (data.scenarios) {
      return data.scenarios.map(sc => ({
        name:        sc.name,
        bottleneck:  sc.bottleneck,
        source:      data.source,
        generated_at: data.generated_at || null,
        ...sc.summary,
      }));
    }
    return [];
  }

  async runLiveSimulation(timeoutMs = 300_000) {
    if (_simulationRunning) throw new Error('SIMULATION_ALREADY_RUNNING');
    _simulationRunning = true;
    try {
      // Remove stale results so we can verify freshness
      if (fs.existsSync(RESULTS_FILE)) fs.unlinkSync(RESULTS_FILE);

      const matlabExe  = process.env.MATLAB_EXECUTABLE || 'matlab';
      const cfgFwd     = REPO_CFG.replace(/\\/g, '/');
      const outFwd     = RESULTS_FILE.replace(/\\/g, '/');
      const repoScripts = REPO_SCRIPTS.replace(/\\/g, '/');

      // Write a wrapper script to %TEMP%.
      // Key: cwd will be DDIR_SCRIPTS so Simulink caches are valid.
      // We override models_dir inside run_retinaguard_sim by calling it after
      // pre-loading the model from the D-drive path.
      const wrapperPath = path.join(os.tmpdir(), 'rg_live_run.m');
      const wrapperContent = [
        "% Auto-generated by RetinaGuard backend — do not edit",
        `addpath('${DDIR_SCRIPTS}');`,
        `addpath('${DDIR_MODELS}');`,
        `addpath('${repoScripts}');`,
        `run_retinaguard_sim('${cfgFwd}', '${outFwd}');`,
      ].join('\n') + '\n';

      fs.writeFileSync(wrapperPath, wrapperContent, 'utf8');

      const wrapperFwd = wrapperPath.replace(/\\/g, '/');
      const matlabArgs = [
        '-nodesktop',
        '-nosplash',
        '-batch',
        `run('${wrapperFwd}')`,
      ];

      await new Promise((resolve, reject) => {
        // cwd = D-drive scripts dir: Simulink caches (slprj, slxc) are valid here
        const child = spawn(matlabExe, matlabArgs, {
          cwd:   'D:\\RetinaGuard_SimEvents\\scripts',
          stdio: 'pipe',
        });
        let stderr = '';
        child.stderr.on('data', d => { stderr += d.toString(); });
        child.stdout.on('data', () => {});

        const timer = setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error(`MATLAB simulation timed out after ${timeoutMs / 1000}s`));
        }, timeoutMs);

        child.on('close', code => {
          clearTimeout(timer);
          if (code !== 0) {
            reject(new Error(
              `MATLAB exited with code ${code}. stderr: ${stderr.slice(0, 600)}`
            ));
          } else {
            resolve();
          }
        });

        child.on('error', err => {
          clearTimeout(timer);
          reject(new Error(`Failed to start MATLAB: ${err.message}`));
        });
      });

      if (!fs.existsSync(RESULTS_FILE)) {
        throw new Error('MATLAB completed but latest_results.json was not produced.');
      }
      const data  = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
      data.source = 'live-matlab';
      return data;
    } finally {
      _simulationRunning = false;
    }
  }

  getInfo() {
    return {
      model:              'RetinaGuard_SimEvents_Day2',
      entry_script:       'simulation/simulink/scripts/run_retinaguard_sim.m',
      config_default:     'simulation/simulink/config/default_scenario.json',
      results_latest:     'simulation/simulink/experiments/latest_results.json',
      results_demo:       'simulation/simulink/experiments/experiment_results.csv',
      has_latest_results: fs.existsSync(RESULTS_FILE),
      has_demo_results:   fs.existsSync(DEMO_CSV),
      simulation_running: _simulationRunning,
    };
  }

  isRunning() { return _simulationRunning; }
}

module.exports = SimulationService;
