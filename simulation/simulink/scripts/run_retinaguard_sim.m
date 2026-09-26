function run_retinaguard_sim(config_path, output_path)
% RUN_RETINAGUARD_SIM  Integration entry point for the RetinaGuard SimEvents capacity model.
%
% Usage (from MATLAB command line or matlab -batch):
%   run_retinaguard_sim('config/default_scenario.json', 'experiments/results.json')
%
% Arguments:
%   config_path  - path to a JSON scenario config (relative to this file or absolute)
%   output_path  - path where the JSON results file will be written
%
% The function is the ONLY interface between the Node.js backend and MATLAB/SimEvents.
% It must never be called per patient case – it runs a full shift-level
% capacity simulation (default: 480 minutes, 10 replications).
%
% Output JSON schema (written to output_path):
%   {
%     "scenario":           string,
%     "stop_time_min":      number,
%     "n_replications":     number,
%     "replications": [
%       {
%         "rep":            number,
%         "patients_done":  number,
%         "capture_util":   number,
%         "ai_util":        number,
%         "reviewer_util":  number,
%         "reviewer_queue_len": number,
%         "avg_wait_capture_min":  number,
%         "avg_wait_reviewer_min": number
%       }, ...
%     ],
%     "summary": {
%       "mean_patients_done":  number,
%       "mean_capture_util":   number,
%       "mean_ai_util":        number,
%       "mean_reviewer_util":  number,
%       "mean_reviewer_queue_len": number,
%       "mean_wait_capture_min":   number,
%       "mean_wait_reviewer_min":  number
%     },
%     "bottleneck":  string,
%     "parameters":  object   (echo of scenario config)
%   }

    %% --- Resolve paths relative to this script ---
    this_dir = fileparts(mfilename('fullpath'));
    models_dir = fullfile(this_dir, '..', 'models');

    if nargin < 1 || isempty(config_path)
        config_path = fullfile(this_dir, '..', 'config', 'default_scenario.json');
    end
    if nargin < 2 || isempty(output_path)
        output_path = fullfile(this_dir, '..', 'experiments', 'latest_results.json');
    end

    %% --- Load configuration ---
    if ~isfile(config_path)
        error('run_retinaguard_sim: config file not found: %s', config_path);
    end
    cfg = jsondecode(fileread(config_path));

    stop_time     = getfield_safe(cfg, 'simulation_stop_time_min', 480);
    n_reps        = getfield_safe(cfg, 'n_replications', 10);
    seed_base     = getfield_safe(cfg, 'seed_base', 1000);
    scenario_name = getfield_safe(cfg, 'scenario_name', 'Default');

    capture_capacity  = cfg.image_capture.capacity_servers;
    capture_svc_t     = cfg.image_capture.service_time_min;
    reviewer_capacity = cfg.specialist_review.capacity_reviewers;
    reviewer_svc_t    = cfg.specialist_review.service_time_min;
    ai_svc_t          = cfg.ai_inference.service_time_min;
    p_poor            = cfg.image_quality.p_poor;
    p_normal          = cfg.ai_inference.p_normal;
    p_referable       = cfg.ai_inference.p_referable;

    %% --- Load Day 2 model ---
    model_name = 'RetinaGuard_SimEvents_Day2';
    addpath(models_dir);
    load_system(model_name);

    set_param(model_name, 'StopTime', num2str(stop_time));

    %% --- Bus object ---
    clear elems;
    elems(1) = Simulink.BusElement; elems(1).Name = 'AIResult'; elems(1).DataType = 'double';
    elems(2) = Simulink.BusElement; elems(2).Name = 'Attempts'; elems(2).DataType = 'double';
    elems(3) = Simulink.BusElement; elems(3).Name = 'Quality';  elems(3).DataType = 'double';
    PatientBus = Simulink.Bus;
    PatientBus.Elements = elems;
    assignin('base', 'PatientBus', PatientBus);

    %% --- Embed literal probabilities in AI server action ---
    ai_entry = sprintf(['persistent init;\nif isempty(init)\n' ...
                       '    seed = sim_seed + 2000;\n' ...
                       '    for i=1:seed; rand(); end\n' ...
                       '    init = true;\nend\n' ...
                       'r = rand();\n' ...
                       'if r < %.6f\n' ...
                       '    entity.AIResult = 1;\n' ...
                       'elseif r < %.6f\n' ...
                       '    entity.AIResult = 2;\n' ...
                       'else\n' ...
                       '    entity.AIResult = 3;\n' ...
                       'end'], p_normal, p_normal + p_referable);

    assignin('base', 'capture_svc_t',    capture_svc_t);
    assignin('base', 'ai_svc_t',         ai_svc_t);
    assignin('base', 'reviewer_svc_t',   reviewer_svc_t);
    assignin('base', 'capture_capacity', capture_capacity);
    assignin('base', 'reviewer_capacity',reviewer_capacity);
    assignin('base', 'p_poor',           p_poor);

    set_param([model_name '/AI'], 'EntryAction', ai_entry);
    set_param([model_name '/AI'], 'ExitAction',  '');

    %% --- Run replications ---
    rep_results = struct('rep', {}, 'patients_done', {}, ...
        'capture_util', {}, 'ai_util', {}, 'reviewer_util', {}, ...
        'reviewer_queue_len', {}, 'avg_wait_capture_min', {}, 'avg_wait_reviewer_min', {});

    for rep = 1:n_reps
        sim_seed = seed_base + rep;
        assignin('base', 'sim_seed', sim_seed);

        simOut = sim(model_name);

        n_term   = extract_ts(simOut, 'stat_term_departed');
        n_normal = extract_ts(simOut, 'stat_normal_departed');
        patients_done = n_term + n_normal;

        rep_results(rep).rep                  = rep;
        rep_results(rep).patients_done        = patients_done;
        rep_results(rep).capture_util         = extract_ts(simOut, 'stat_cap_util');
        rep_results(rep).ai_util              = extract_ts(simOut, 'stat_ai_util');
        rep_results(rep).reviewer_util        = extract_ts(simOut, 'stat_rev_util');
        rep_results(rep).reviewer_queue_len   = extract_ts(simOut, 'stat_rev_q_len');
        rep_results(rep).avg_wait_capture_min = extract_ts(simOut, 'stat_cap_wait');
        rep_results(rep).avg_wait_reviewer_min= extract_ts(simOut, 'stat_rev_wait');

        fprintf('  Rep %2d | Done=%4.0f | CapUtil=%.3f | RevUtil=%.3f\n', ...
            rep, patients_done, rep_results(rep).capture_util, rep_results(rep).reviewer_util);
    end

    close_system(model_name, 0);

    %% --- Compute summary ---
    done_vals    = [rep_results.patients_done];
    cap_vals     = [rep_results.capture_util];
    ai_vals      = [rep_results.ai_util];
    rev_vals     = [rep_results.reviewer_util];
    revq_vals    = [rep_results.reviewer_queue_len];
    waitc_vals   = [rep_results.avg_wait_capture_min];
    waitr_vals   = [rep_results.avg_wait_reviewer_min];

    summary.mean_patients_done      = mean(done_vals, 'omitnan');
    summary.mean_capture_util       = mean(cap_vals,  'omitnan');
    summary.mean_ai_util            = mean(ai_vals,   'omitnan');
    summary.mean_reviewer_util      = mean(rev_vals,  'omitnan');
    summary.mean_reviewer_queue_len = mean(revq_vals, 'omitnan');
    summary.mean_wait_capture_min   = mean(waitc_vals,'omitnan');
    summary.mean_wait_reviewer_min  = mean(waitr_vals,'omitnan');

    %% --- Identify bottleneck ---
    utils = [summary.mean_capture_util, summary.mean_ai_util, summary.mean_reviewer_util];
    labels = {'ImageCapture', 'AIInference', 'SpecialistReview'};
    [~, idx] = max(utils);
    bottleneck = labels{idx};

    %% --- Build output struct ---
    out.scenario       = scenario_name;
    out.stop_time_min  = stop_time;
    out.n_replications = n_reps;
    out.replications   = rep_results;
    out.summary        = summary;
    out.bottleneck     = bottleneck;
    out.parameters.capture_capacity  = capture_capacity;
    out.parameters.capture_svc_t     = capture_svc_t;
    out.parameters.reviewer_capacity = reviewer_capacity;
    out.parameters.reviewer_svc_t    = reviewer_svc_t;
    out.parameters.ai_svc_t          = ai_svc_t;
    out.parameters.p_poor            = p_poor;
    out.parameters.p_normal          = p_normal;
    out.parameters.p_referable       = p_referable;
    out.parameters.p_uncertain       = 1 - p_normal - p_referable;
    out.generated_at  = datestr(now, 'yyyy-mm-ddTHH:MM:SS');

    %% --- Write JSON output ---
    out_dir = fileparts(output_path);
    if ~isempty(out_dir) && ~isfolder(out_dir)
        mkdir(out_dir);
    end
    fid = fopen(output_path, 'w');
    if fid == -1
        error('run_retinaguard_sim: cannot write output to: %s', output_path);
    end
    fwrite(fid, jsonencode(out));
    fclose(fid);

    fprintf('[OK] Simulation complete. Results written to: %s\n', output_path);
    fprintf('[OK] Bottleneck: %s | Mean throughput: %.1f patients/shift\n', ...
        bottleneck, summary.mean_patients_done);
end

%% ── helpers ──────────────────────────────────────────────────────────────────
function val = getfield_safe(s, field, default_val)
    if isfield(s, field)
        val = s.(field);
    else
        val = default_val;
    end
end

function val = extract_ts(simOut, var_name)
    if ~isprop(simOut, var_name)
        warning('extract_ts: "%s" not in SimulationOutput – returning NaN', var_name);
        val = NaN; return;
    end
    ts = simOut.(var_name);
    if ~isa(ts, 'timeseries') || isempty(ts.Data)
        warning('extract_ts: "%s" empty or wrong type – returning NaN', var_name);
        val = NaN; return;
    end
    data = squeeze(ts.Data);
    if contains(var_name, 'departed')
        val = data(end);
    else
        val = mean(data);
    end
end
