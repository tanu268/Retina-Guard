% Forensic throughput audit: run one replication of S1 and S2 manually,
% check all stats, verify seed effect, and compute expected throughput analytically.

addpath('..\models');

%% ---- S1 Baseline parameters ----
assignin('base', 'effective_cap_svc_t', 5/(1-0.15));  % = 5.882
assignin('base', 'ai_svc_t', 3);
assignin('base', 'reviewer_svc_t', 3);
assignin('base', 'capture_capacity', 10);
assignin('base', 'reviewer_capacity', 2);

% Set AI entry action
load_system('RetinaGuard_SimEvents_Day2');
ai_entry_s1 = sprintf('r = rand();\nif r < 0.700000\n    entity.AIResult = 1;\nelse\n    entity.AIResult = 2;\nend');
set_param('RetinaGuard_SimEvents_Day2/AI', 'EntryAction', ai_entry_s1);
set_param('RetinaGuard_SimEvents_Day2', 'StopTime', '480');

fprintf('=== S1 Baseline - Rep 1 ===\n');
rng(1001);
simOut = sim('RetinaGuard_SimEvents_Day2');

fprintf('simOut variables: '); disp(simOut.who());
fprintf('stat_term_departed Data: '); disp(simOut.stat_term_departed.Data');
fprintf('stat_normal_departed Data: '); disp(simOut.stat_normal_departed.Data');
fprintf('stat_cap_util - is empty?: %d\n', isempty(simOut.stat_cap_util.Data));
fprintf('stat_ai_util - is empty?: %d\n', isempty(simOut.stat_ai_util.Data));
fprintf('stat_rev_util - is empty?: %d\n', isempty(simOut.stat_rev_util.Data));

total_done = simOut.stat_term_departed.Data(end) + simOut.stat_normal_departed.Data(end);
fprintf('\n[S1 Rep1] total entities departed = %d\n', total_done);

%% ---- Analytical sanity check ----
% S1: arrival rate = 1/0.5 = 2/min
% Capture: 10 servers, svc_t = 5.882 -> throughput = 10/5.882 = 1.70/min
% AI: 1 server, but all go through -> if cap svc_t is bottleneck, rate is 1.70/min
% Reviewer: gets 30% -> 0.51/min arriving, 2 servers, svc_t=3 -> capacity 0.667/min
% Stop time = 480 min
% Expected throughput ~ bottleneck rate * 480
arrival_rate = 1/0.5; % 2/min
cap_throughput = 10 / (5/0.85); % ~1.70/min (p_poor=0.15 absorbed)
rev_arrival = cap_throughput * 0.30; % ~0.51/min to reviewer
rev_capacity_rate = 2/3; % ~0.667/min
fprintf('\n=== Analytical throughput estimates S1 ===\n');
fprintf('Arrival rate: %.2f/min\n', arrival_rate);
fprintf('Capture throughput: %.4f/min\n', cap_throughput);
fprintf('Reviewer arrival rate: %.4f/min\n', rev_arrival);
fprintf('Reviewer capacity rate: %.4f/min\n', rev_capacity_rate);
fprintf('Bottleneck: %s\n', 'Arrival rate > Capture > Reviewer served');

fprintf('\nExpected total done in 480 min ~ %.0f\n', min(arrival_rate, cap_throughput) * 0.7 * 480 + min(arrival_rate, cap_throughput) * 0.3 * 480);

%% ---- S2 AI Offload ----
assignin('base', 'effective_cap_svc_t', 5/(1-0.15));
assignin('base', 'ai_svc_t', 1);
assignin('base', 'reviewer_svc_t', 3);
assignin('base', 'capture_capacity', 10);
assignin('base', 'reviewer_capacity', 2);
ai_entry_s2 = sprintf('r = rand();\nif r < 0.800000\n    entity.AIResult = 1;\nelse\n    entity.AIResult = 2;\nend');
set_param('RetinaGuard_SimEvents_Day2/AI', 'EntryAction', ai_entry_s2);

fprintf('\n=== S2 AI Offload - Rep 1 ===\n');
rng(2001);
simOut2 = sim('RetinaGuard_SimEvents_Day2');
total_done2 = simOut2.stat_term_departed.Data(end) + simOut2.stat_normal_departed.Data(end);
fprintf('[S2 Rep1] total entities departed = %d\n', total_done2);
fprintf('[S2] stat_cap_util empty: %d\n', isempty(simOut2.stat_cap_util.Data));

close_system('RetinaGuard_SimEvents_Day2', 0);
exit;
