% Master build + experiment runner
% Runs in a single MATLAB session to avoid repeated startup overhead
% Added fail-fast assertions and error handling per P0 remediation plan

% Make it path-independent by using the script's own path
script_dir = fileparts(mfilename('fullpath'));
cd(script_dir);
addpath('..\models');

try
    fprintf('=== STEP 1: Build Day 1 ===\n');
    build_day1();

    fprintf('\n=== STEP 2: Build Day 2 ===\n');
    build_day2();

    fprintf('\n=== STEP 2.5: Build Day 2 Stats ===\n');
    build_day2_stats();

    fprintf('\n=== STEP 3: Run Experiments ===\n');
    results = run_experiments();
    
    fprintf('\n=== ALL DONE ===\n');
catch ME
    fprintf(2, '\n=== FATAL ERROR IN PIPELINE ===\n');
    fprintf(2, 'Message: %s\n', ME.message);
    for i = 1:length(ME.stack)
        fprintf(2, '  In %s (line %d)\n', ME.stack(i).file, ME.stack(i).line);
    end
    exit(1);
end

exit(0);
