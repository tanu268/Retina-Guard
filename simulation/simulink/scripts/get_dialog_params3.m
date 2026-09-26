addpath('..\models');
load_system('RetinaGuard_SimEvents_Day2');
disp('--- Entity Output Switch ---');
disp(get_param('RetinaGuard_SimEvents_Day2/AI Switch', 'DialogParameters'));
disp('--- Entity Generator ---');
disp(get_param('RetinaGuard_SimEvents_Day2/Generator', 'DialogParameters'));
close_system('RetinaGuard_SimEvents_Day2', 0);
exit;
