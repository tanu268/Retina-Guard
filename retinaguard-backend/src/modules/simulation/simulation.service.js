'use strict';

/**
 * simulationService.js
 *
 * Provides access to RetinaGuard SimEvents capacity-planning simulation results.
 *
 * Architecture:
 *   - The simulation is an OFFLINE capacity/planning model, NOT a per-case
 *     runtime dependency. It models the healthcare *workflow* at the shift level.
 *   - Results are pre-computed by running run_retinaguard_sim.m in MATLAB and
 *     stored as JSON in simulation/simulink/experiments/latest_results.json.
 *   - This service reads that file and exposes it through the API.
 *   - When MATLAB is available and configured, the service can also trigger a
 *     new simulation run via the MATLAB CLI adapter pattern (same pattern as
 *     MatlabCliAdapter used for clinical inference).
 *
 * The application works fully without MATLAB. If the results file is absent,
 * the service returns seeded demonstration results drawn from the verified
 * experiment_results.csv (10 reps x 3 scenarios, real MATLAB output).
 */

const path = require('path');
const fs   = require('fs');

const RESULTS_FILE = path.resolve(
  __dirname, '..', '..', '..', '..', '..', 'simulation',
  'simulink', 'experiments', 'latest_results.json'
);

const DEMO_CSV_FILE = path.resolve(
  __dirname, '..', '..', '..', '..', '..', 'simulation',
  'simulink', 'experiments', 'experiment_results.csv'
);

/**
 * Parse the experiment_results.csv written by run_experiments.m.
 * Returns { scenarios: [ { name, replications: [...], summary: {...} } ] }
 */
function parseDemoCsv() {
  if (!fs.existsSync(DEMO_CSV_FILE)) return null;

  const raw = fs.readFileSync(DEMO_CSV_FILE, 'utf8');
  const lines = raw.trim().split('\n').filter(Boolean);
  const header = lines[0].split(',');

  const rows = lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj = {};
    header.forEach((h, i) => {
      obj[h.trim()] = isNaN(vals[i]) ? vals[i].trim() : parseFloat(vals[i]);
    });
    return obj;
  });

  const scenarioMap = {};
  rows.forEach(r => {
    if (!scenarioMap[r.scenario]) scenarioMap[r.scenario] = [];
    scenarioMap[r.scenario].push({
      rep:                   r.rep,
      patients_done:         r.patients_done,
      capture_util:          r.capture_util,
      ai_util:               r.ai_util,
      reviewer_util:         r.reviewer_util,
      reviewer_queue_len:    r.reviewer_queue_len,
      avg_wait_capture_min:  r.avg_wait_capture,
      avg_wait_reviewer_min: r.avg_wait_reviewer,
    });
  });

  const scenarios = Object.entries(scenarioMap).map(([name, reps]) => {
    const mean = key => reps.reduce((s, r) => s + (r[key] || 0), 0) / reps.length;
    const utils = [mean('capture_util'), mean('ai_util'), mean('reviewer_util')];
    const labels = ['ImageCapture', 'AIInference', 'SpecialistReview'];
    const bottleneck = labels[utils.indexOf(Math.max(...utils))];

    return {
      name,
      replications: reps,
      summary: {
        mean_patients_done:      mean('patients_done'),
        mean_capture_util:       mean('capture_util'),
        mean_ai_util:            mean('ai_util'),
        mean_reviewer_util:      mean('reviewer_util'),
        mean_reviewer_queue_len: mean('reviewer_queue_len'),
        mean_wait_capture_min:   mean('avg_wait_capture_min'),
        mean_wait_reviewer_min:  mean('avg_wait_reviewer_min'),
      },
      bottleneck,
    };
  });

  return { scenarios, source: 'demo_csv', generated_at: null };
}

class SimulationService {
  /**
   * Return the latest simulation results.
   * Priority:
   *   1. latest_results.json (written by run_retinaguard_sim.m)
   *   2. experiment_results.csv (demo / verification results from Day 2 run)
   *   3. null (caller should surface a clear "no results" state)
   */
  getLatestResults() {
    if (fs.existsSync(RESULTS_FILE)) {
      try {
        const raw = fs.readFileSync(RESULTS_FILE, 'utf8');
        const data = JSON.parse(raw);
        data.source = 'latest_results';
        return data;
      } catch (e) {
        // fall through to demo
      }
    }

    const demo = parseDemoCsv();
    if (demo) return demo;

    return null;
  }

  /**
   * Return scenario summary rows for the dashboard (one row per scenario).
   */
  getSummaries() {
    const data = this.getLatestResults();
    if (!data) return [];

    // Single-scenario format (from run_retinaguard_sim.m)
    if (data.scenario && data.summary) {
      return [{
        name:                    data.scenario,
        stop_time_min:           data.stop_time_min,
        n_replications:          data.n_replications,
        bottleneck:              data.bottleneck,
        parameters:              data.parameters || {},
        ...data.summary,
        source:                  data.source,
        generated_at:            data.generated_at || null,
      }];
    }

    // Multi-scenario format (from parseDemoCsv)
    if (data.scenarios) {
      return data.scenarios.map(sc => ({
        name:           sc.name,
        bottleneck:     sc.bottleneck,
        source:         data.source,
        generated_at:   data.generated_at || null,
        ...sc.summary,
      }));
    }

    return [];
  }

  /**
   * Return metadata about the simulation assets in the repository.
   */
  getInfo() {
    return {
      model_day1: 'simulation/simulink/models/RetinaGuard_SimEvents_Day1_Verified.slx',
      model_day2: 'simulation/simulink/models/RetinaGuard_SimEvents_Day2.slx',
      entry_script: 'simulation/simulink/scripts/run_retinaguard_sim.m',
      config_default: 'simulation/simulink/config/default_scenario.json',
      results_latest: 'simulation/simulink/experiments/latest_results.json',
      results_demo: 'simulation/simulink/experiments/experiment_results.csv',
      has_latest_results: fs.existsSync(RESULTS_FILE),
      has_demo_results:   fs.existsSync(DEMO_CSV_FILE),
    };
  }
}

module.exports = SimulationService;
