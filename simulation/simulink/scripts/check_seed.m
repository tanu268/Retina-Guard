model_name = 'RetinaGuard_SimEvents_Day2';
load_system('d:\RetinaG\RetinaGuard_SimEvents\models\RetinaGuard_SimEvents_Day2.slx');
gen_seed = get_param([model_name '/Generator'], 'Seed');
disp(['Generator Seed: ' gen_seed]);
close_system(model_name, 0);
exit;
