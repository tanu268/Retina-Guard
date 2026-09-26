function results = run_experiments()
    % =========================================================
    % RetinaGuard SimEvents - Experiment Runner
    % 3 scenarios x N_REPS replications on Day 2 model.
    %
    % Key constraint: SimEvents ExitAction/EntryAction/GenerateAction code
    % is compiled (code generation) -- evalin/assignin NOT supported.
    % Solution: embed scenario probability literals directly into the
    % action code string before each sim() call via set_param.
    %
    % Dialog params (ServiceTimeValue, Capacity) CAN reference base
    % workspace variable names -- only action code is restricted.
    % =========================================================
    scripts_dir = fileparts(mfilename('fullpath'));
    models_dir  = fullfile(scripts_dir, '..', 'models');
    exp_dir     = fullfile(scripts_dir, '..', 'experiments');
    addpath(models_dir);

    model_name = 'RetinaGuard_SimEvents_Day2';
    N_REPS     = 10;
    STOP_TIME  = 480;

    %% ---- Scenario Definitions ----
    scenarios(1).name              = 'S1_Baseline';
    scenarios(1).p_poor            = 0.15;
    scenarios(1).p_normal          = 0.70;
    scenarios(1).p_referable       = 0.20;
    scenarios(1).p_uncertain       = 0.10;
    scenarios(1).capture_capacity  = 10;
    scenarios(1).capture_svc_t     = 5;
    scenarios(1).ai_svc_t          = 3;
    scenarios(1).reviewer_capacity = 2;
    scenarios(1).reviewer_svc_t    = 3;

    scenarios(2).name              = 'S2_AI_Offload';
    scenarios(2).p_poor            = 0.15;
    scenarios(2).p_normal          = 0.80;
    scenarios(2).p_referable       = 0.15;
    scenarios(2).p_uncertain       = 0.05;
    scenarios(2).capture_capacity  = 10;
    scenarios(2).capture_svc_t     = 5;
    scenarios(2).ai_svc_t          = 1;
    scenarios(2).reviewer_capacity = 2;
    scenarios(2).reviewer_svc_t    = 3;

    scenarios(3).name              = 'S3_Capacity_Scaled';
    scenarios(3).p_poor            = 0.15;
    scenarios(3).p_normal          = 0.70;
    scenarios(3).p_referable       = 0.20;
    scenarios(3).p_uncertain       = 0.10;
    scenarios(3).capture_capacity  = 20;
    scenarios(3).capture_svc_t     = 5;
    scenarios(3).ai_svc_t          = 3;
    scenarios(3).reviewer_capacity = 4;
    scenarios(3).reviewer_svc_t    = 3;

    %% ---- Load Model & Prepare Bus ----
    load_system(model_name);
    set_param(model_name, 'StopTime', num2str(STOP_TIME));
    
    clear elems;
    elems(1) = Simulink.BusElement; elems(1).Name = 'AIResult'; elems(1).DataType = 'double';
    elems(2) = Simulink.BusElement; elems(2).Name = 'Attempts'; elems(2).DataType = 'double';
    elems(3) = Simulink.BusElement; elems(3).Name = 'Quality'; elems(3).DataType = 'double';
    PatientBus = Simulink.Bus;
    PatientBus.Elements = elems;
    assignin('base', 'PatientBus', PatientBus);

    %% ---- Run Experiments ----
    result_rows = {};

    for s = 1:length(scenarios)
        sc = scenarios(s);
        fprintf('\n=== Running %s ===\n', sc.name);

        % Build AI EntryAction with LITERAL probability values embedded in code.
        % This avoids evalin (not supported in code generation).
        ai_entry = sprintf(['persistent init;\nif isempty(init)\n' ...
                           '    seed = sim_seed + 2000;\n' ...
                           '    for i=1:seed; rand(); end\n' ...
                           '    init = true;\nend\n' ...
                           'r = rand();' newline ...
                           'if r < %.6f' newline ...
                           '    entity.AIResult = 1;' newline ...
                           'elseif r < %.6f' newline ...
                           '    entity.AIResult = 2;' newline ...
                           'else' newline ...
                           '    entity.AIResult = 3;' newline ...
                           'end'], sc.p_normal, sc.p_normal + sc.p_referable);

        % Set dialog params (workspace variables OK here -- evaluated pre-compile)
        assignin('base', 'capture_svc_t',       sc.capture_svc_t);
        assignin('base', 'ai_svc_t',            sc.ai_svc_t);
        assignin('base', 'reviewer_svc_t',      sc.reviewer_svc_t);
        assignin('base', 'capture_capacity',    sc.capture_capacity);
        assignin('base', 'reviewer_capacity',   sc.reviewer_capacity);
        assignin('base', 'p_poor',              sc.p_poor);

        % Embed scenario probabilities into AI server action code
        set_param([model_name '/AI'], 'ExitAction', '');
        set_param([model_name '/AI'], 'EntryAction', ai_entry);

        for rep = 1:N_REPS
            % Unique reproducible seed per replication via InitFcn
            assignin('base', 'sim_seed', 1000 * s + rep);

            % Run simulation
            simOut = sim(model_name);

            % Collect statistics from simOut timeseries (fail-loud: no silent zero-fill)
            n_term   = extract_ts(simOut, 'stat_term_departed');
            n_normal = extract_ts(simOut, 'stat_normal_departed');
            patients_done = n_term + n_normal;

            cap_util  = extract_ts(simOut, 'stat_cap_util');
            ai_util   = extract_ts(simOut, 'stat_ai_util');
            rev_util  = extract_ts(simOut, 'stat_rev_util');
            rev_q_len = extract_ts(simOut, 'stat_rev_q_len');
            cap_wait  = extract_ts(simOut, 'stat_cap_wait');
            rev_wait  = extract_ts(simOut, 'stat_rev_wait');

            % --- P0 ASSERTION: flag any NaN metrics so they appear in output ---
            metric_names = {'patients_done','cap_util','ai_util','rev_util','rev_q_len','cap_wait','rev_wait'};
            metric_vals  = [patients_done, cap_util, ai_util, rev_util, rev_q_len, cap_wait, rev_wait];
            for mi = 1:numel(metric_vals)
                if isnan(metric_vals(mi))
                    warning('[P0 ASSERTION] Scenario=%s Rep=%d: metric "%s" is NaN — stat logging may be broken.', ...
                        sc.name, rep, metric_names{mi});
                end
            end

            result_rows{end+1} = {sc.name, rep, patients_done, ...
                cap_util, ai_util, rev_util, ...
                rev_q_len, cap_wait, rev_wait}; %#ok<AGROW>

            fprintf('  Rep %2d | Done=%4.0f | CapUtil=%.3f | AIUtil=%.3f | RevUtil=%.3f | RevQ=%.2f\n', ...
                rep, patients_done, cap_util, ai_util, rev_util, rev_q_len);
        end
    end

    close_system(model_name, 0);

    %% ---- Build results table ----
    fields = {'scenario','rep','patients_done','capture_util', ...
              'ai_util','reviewer_util','reviewer_queue_len', ...
              'avg_wait_capture','avg_wait_reviewer'};
    results = cell2table(vertcat(result_rows{:}), 'VariableNames', fields);

    %% ---- Write CSV ----
    csv_path = fullfile(exp_dir, 'experiment_results.csv');
    writetable(results, csv_path);
    fprintf('\n[OK] Results written to: %s\n', csv_path);

    %% ---- Summary Table (NaN-tolerant means) ----
    fprintf('\n=== SCENARIO SUMMARY (means over %d reps) ===\n', N_REPS);
    fprintf('%-25s %8s %8s %8s %8s %8s\n', ...
        'Scenario','Done','CapUtil','AIUtil','RevUtil','RevQLen');
    for s = 1:length(scenarios)
        mask = strcmp(results.scenario, scenarios(s).name);
        fprintf('%-25s %8.1f %8.3f %8.3f %8.3f %8.2f\n', ...
            scenarios(s).name, ...
            mean(results.patients_done(mask), 'omitnan'), ...
            mean(results.capture_util(mask),  'omitnan'), ...
            mean(results.ai_util(mask),       'omitnan'), ...
            mean(results.reviewer_util(mask), 'omitnan'), ...
            mean(results.reviewer_queue_len(mask), 'omitnan'));
    end
end



%% ---- Helper: extract final value from simOut timeseries ----
% FAIL-LOUD: errors are surfaced, not silently converted to 0.
% A NaN return indicates missing data (not error); caller will see NaN in CSV.
function val = extract_ts(simOut, var_name)
    % Verify the variable exists in SimulationOutput
    if ~isprop(simOut, var_name)
        error('extract_ts: variable "%s" not found in SimulationOutput. Check build_day2_stats.m logging setup.', var_name);
    end
    
    ts = simOut.(var_name);
    
    % Must be a timeseries
    if ~isa(ts, 'timeseries')
        error('extract_ts: "%s" is class %s, expected timeseries. Check stat port connection in build_day2_stats.m.', var_name, class(ts));
    end
    
    if isempty(ts.Data)
        warning('extract_ts: "%s" has empty Data array — returning NaN (not 0).', var_name);
        val = NaN;
        return;
    end
    
    % Scalar squeeze (SimEvents util timeseries can be 3-D: [N x 1 x 1])
    data = squeeze(ts.Data);
    
    if contains(var_name, 'departed')
        val = data(end);   % Cumulative count — take final value
    else
        val = mean(data);  % Time-averaged metric
    end
end
