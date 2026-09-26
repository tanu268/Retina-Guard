model_name = 'RetinaGuard_SimEvents_Day2';
addpath('..\models');
load_system(model_name);

% Setup workspace
assignin('base', 'effective_cap_svc_t', 5/(1-0.15));
assignin('base', 'ai_svc_t', 3);
assignin('base', 'reviewer_svc_t', 3);
assignin('base', 'capture_capacity', 10);
assignin('base', 'reviewer_capacity', 2);
ai_entry_s1 = sprintf('r = rand();\nif r < 0.700000\n    entity.AIResult = 1;\nelse\n    entity.AIResult = 2;\nend');
set_param([model_name '/AI'], 'EntryAction', ai_entry_s1);
set_param(model_name, 'StopTime', '100');
rng(1001);

% Fix the stat logging in the loaded model
% Delete the existing line to To Workspace
try delete_line(model_name, 'Capture Server/2', 'Capture Server_stat_cap_util/1'); catch; end

% Connect port 1 (which we suspect is Utilization) to To Workspace
add_line(model_name, 'Capture Server/1', 'Capture Server_stat_cap_util/1', 'autorouting', 'on');

% Let's also set To Workspace to save as timeseries
set_param([model_name '/Capture Server_stat_cap_util'], 'SaveFormat', 'Timeseries');

simOut = sim(model_name);

fprintf('=== Capture Server Utilization from Port 1 ===\n');
try
    disp(class(simOut.stat_cap_util));
    disp(simOut.stat_cap_util.Data(1:10));
catch ME
    disp(ME.message);
end

close_system(model_name, 0);
exit;
