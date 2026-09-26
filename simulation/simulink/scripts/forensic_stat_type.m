% Forensic: What type is stat_cap_util? What does it contain?
addpath('..\models');
assignin('base', 'effective_cap_svc_t', 5/(1-0.15));
assignin('base', 'ai_svc_t', 3);
assignin('base', 'reviewer_svc_t', 3);
assignin('base', 'capture_capacity', 10);
assignin('base', 'reviewer_capacity', 2);
load_system('RetinaGuard_SimEvents_Day2');
ai_entry_s1 = sprintf('r = rand();\nif r < 0.700000\n    entity.AIResult = 1;\nelse\n    entity.AIResult = 2;\nend');
set_param('RetinaGuard_SimEvents_Day2/AI', 'EntryAction', ai_entry_s1);
set_param('RetinaGuard_SimEvents_Day2', 'StopTime', '10');
rng(1001);
simOut = sim('RetinaGuard_SimEvents_Day2');

fprintf('=== stat_term_departed ===\n');
disp(class(simOut.stat_term_departed));
disp(simOut.stat_term_departed);

fprintf('\n=== stat_cap_util ===\n');
disp(class(simOut.stat_cap_util));
disp(simOut.stat_cap_util);

fprintf('\n=== stat_ai_util ===\n');
disp(class(simOut.stat_ai_util));

fprintf('\nFinal term departed count: %d\n', simOut.stat_term_departed.Data(end));
fprintf('Final normal departed count: %d\n', simOut.stat_normal_departed.Data(end));
fprintf('Total patients done: %d\n', simOut.stat_term_departed.Data(end) + simOut.stat_normal_departed.Data(end));

close_system('RetinaGuard_SimEvents_Day2', 0);
exit;
