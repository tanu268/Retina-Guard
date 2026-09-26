addpath('..\models');
load_system('RetinaGuard_SimEvents_Day2');
disp(get_param('RetinaGuard_SimEvents_Day2/Capture Server', 'DialogParameters'));
close_system('RetinaGuard_SimEvents_Day2', 0);
exit;
