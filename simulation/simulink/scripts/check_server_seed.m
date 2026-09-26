model_name = 'RetinaGuard_SimEvents_Day2';
load_system('d:\RetinaG\RetinaGuard_SimEvents\models\RetinaGuard_SimEvents_Day2.slx');
dp = get_param([model_name '/Capture Server'], 'DialogParameters');
disp(fieldnames(dp));
close_system(model_name, 0);
exit;
