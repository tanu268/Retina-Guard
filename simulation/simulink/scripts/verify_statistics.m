% verify_statistics.m
% =========================================================
% P0 Verification: validate that experiment_results.csv contains
% statistically defensible, non-pathological results.
%
% Exit code 0 = PASS
% Exit code 1 = FAIL (with printed diagnostics)
% =========================================================

scripts_dir = fileparts(mfilename('fullpath'));
exp_dir     = fullfile(scripts_dir, '..', 'experiments');
csv_path    = fullfile(exp_dir, 'experiment_results.csv');

if ~isfile(csv_path)
    fprintf(2, '[FAIL] experiment_results.csv not found at: %s\n', csv_path);
    exit(1);
end

T = readtable(csv_path);
fprintf('[INFO] Loaded %d rows from %s\n', height(T), csv_path);

pass = true;

%% ---- 1. No NaN values anywhere ----
for col = T.Properties.VariableNames
    c = col{1};
    if isnumeric(T.(c))
        n_nan = sum(isnan(T.(c)));
        if n_nan > 0
            fprintf(2, '[FAIL] Column "%s" has %d NaN values — stat extraction broken.\n', c, n_nan);
            pass = false;
        else
            fprintf('[PASS] Column "%s": no NaNs.\n', c);
        end
    end
end

%% ---- 2. patients_done > 0 for every rep ----
if any(T.patients_done <= 0)
    fprintf(2, '[FAIL] Some reps have patients_done <= 0 — entities not flowing.\n');
    disp(T(T.patients_done <= 0, :));
    pass = false;
else
    fprintf('[PASS] patients_done > 0 for all %d rows.\n', height(T));
end

%% ---- 3. Utilization in [0, 1] ----
util_cols = {'capture_util','ai_util','reviewer_util'};
for i = 1:numel(util_cols)
    c = util_cols{i};
    vals = T.(c);
    if any(vals < 0 | vals > 1)
        fprintf(2, '[FAIL] Column "%s" has values outside [0,1]: min=%.4f max=%.4f\n', c, min(vals), max(vals));
        pass = false;
    else
        fprintf('[PASS] %s in [0,1]: min=%.4f max=%.4f\n', c, min(vals), max(vals));
    end
end

%% ---- 4. Wait times >= 0 ----
wait_cols = {'avg_wait_capture','avg_wait_reviewer'};
for i = 1:numel(wait_cols)
    c = wait_cols{i};
    vals = T.(c);
    if any(vals < 0)
        fprintf(2, '[FAIL] Column "%s" has negative values.\n', c);
        pass = false;
    else
        fprintf('[PASS] %s >= 0: mean=%.3f\n', c, mean(vals,'omitnan'));
    end
end

%% ---- 5. Per-scenario summary ----
fprintf('\n=== PER-SCENARIO SUMMARY ===\n');
fprintf('%-25s %6s %8s %8s %8s %8s %8s %8s\n', ...
    'Scenario', 'Reps', 'Done', 'CapUtil', 'AIUtil', 'RevUtil', 'CapWait', 'RevWait');
scenarios = unique(T.scenario);
for i = 1:numel(scenarios)
    s = scenarios{i};
    m = strcmp(T.scenario, s);
    fprintf('%-25s %6d %8.1f %8.3f %8.3f %8.3f %8.2f %8.2f\n', ...
        s, sum(m), ...
        mean(T.patients_done(m),'omitnan'), ...
        mean(T.capture_util(m),'omitnan'), ...
        mean(T.ai_util(m),'omitnan'), ...
        mean(T.reviewer_util(m),'omitnan'), ...
        mean(T.avg_wait_capture(m),'omitnan'), ...
        mean(T.avg_wait_reviewer(m),'omitnan'));
end

%% ---- Final verdict ----
if pass
    fprintf('\n[VERIFICATION PASSED] All checks passed.\n');
    exit(0);
else
    fprintf(2, '\n[VERIFICATION FAILED] One or more checks failed. See above.\n');
    exit(1);
end
