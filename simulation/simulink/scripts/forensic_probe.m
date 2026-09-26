% Forensic probe: verify what the Generator inter-generation time ACTUALLY is
% and test if rng() controls SimEvents randomness

addpath('..\models');
load_system('RetinaGuard_SimEvents_Day2');

fprintf('=== Generator params ===\n');
disp(fieldnames(get_param('RetinaGuard_SimEvents_Day2/Generator', 'DialogParameters')));

fprintf('\n=== Generator intergen time setting ===\n');
try; disp(get_param('RetinaGuard_SimEvents_Day2/Generator', 'IntergenerationTimeAction')); catch ME; disp(ME.message); end
try; disp(get_param('RetinaGuard_SimEvents_Day2/Generator', 'Period')); catch ME; disp(ME.message); end
try; disp(get_param('RetinaGuard_SimEvents_Day2/Generator', 'IntergenerationTimeValue')); catch ME; disp(ME.message); end
try; disp(get_param('RetinaGuard_SimEvents_Day2/Generator', 'IntergenerationTimeSource')); catch ME; disp(ME.message); end

fprintf('\n=== AI Block params ===\n');
disp(get_param('RetinaGuard_SimEvents_Day2/AI', 'Capacity'));
disp(get_param('RetinaGuard_SimEvents_Day2/AI', 'EntryAction'));
disp(get_param('RetinaGuard_SimEvents_Day2/AI', 'ExitAction'));

fprintf('\n=== AI Switch switching criterion ===\n');
disp(get_param('RetinaGuard_SimEvents_Day2/AI Switch', 'SwitchingCriterion'));
disp(get_param('RetinaGuard_SimEvents_Day2/AI Switch', 'SwitchAttributeName'));

fprintf('\n=== Reviewer Server capacity ===\n');
disp(get_param('RetinaGuard_SimEvents_Day2/Reviewer Server', 'Capacity'));

fprintf('\n=== Blocks in model ===\n');
blks = find_system('RetinaGuard_SimEvents_Day2', 'SearchDepth', 1, 'Type', 'Block');
disp(blks);

close_system('RetinaGuard_SimEvents_Day2', 0);
exit;
