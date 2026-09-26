model_name = 'RetinaGuard_SimEvents_Day2';
load_system('d:\RetinaG\RetinaGuard_SimEvents\models\RetinaGuard_SimEvents_Day2.slx');
p = get_param(model_name, 'ObjectParameters');
names = fieldnames(p);
idx = contains(lower(names), 'rand') | contains(lower(names), 'seed');
disp(names(idx));
close_system(model_name, 0);
exit;
