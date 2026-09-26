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

simOut = sim(model_name);

fprintf('=== get_param after sim ===\n');
try
    cap_util = get_param([model_name '/Capture Server'], 'Utilization');
    fprintf('Capture Server Utilization: %f\n', cap_util);
catch ME
    fprintf('Failed to get Utilization parameter: %s\n', ME.message);
end

close_system(model_name, 0);
exit;
