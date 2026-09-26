% Check how to get block statistics
addpath('..\models');
load_system('RetinaGuard_SimEvents_Day2');
sim('RetinaGuard_SimEvents_Day2');

try
    fprintf('Testing get_param for stats...\n');
    val = get_param('RetinaGuard_SimEvents_Day2/Terminator', 'NumberEntitiesDeparted');
    disp(val);
catch ME
    fprintf('Failed: %s\n', ME.message);
end

% Check dialog parameters of Terminator
disp('Terminator params:');
disp(fieldnames(get_param('RetinaGuard_SimEvents_Day2/Terminator', 'DialogParameters')));

close_system('RetinaGuard_SimEvents_Day2', 0);
exit;
