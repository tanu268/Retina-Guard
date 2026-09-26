% Test statistics extraction with Dataset format
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

% Change SaveFormat for the To Workspace blocks to Dataset
tw_blocks = find_system(model_name, 'BlockType', 'ToWorkspace');
for i = 1:length(tw_blocks)
    set_param(tw_blocks{i}, 'SaveFormat', 'Dataset');
end

% Set the model to return a single SimulationOutput object
set_param(model_name, 'ReturnWorkspaceOutputs', 'on');
set_param(model_name, 'ReturnWorkspaceOutputsName', 'out');

simOut = sim(model_name);

disp(simOut);

cap_util = simOut.get('stat_cap_util');
disp('=== Capture Server Utilization ===');
disp(class(cap_util));
if isprop(cap_util, 'Values')
    disp(cap_util.Values);
else
    disp(cap_util);
end

close_system(model_name, 0);
exit;
