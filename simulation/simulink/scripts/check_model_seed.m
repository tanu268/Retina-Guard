model_name = 'RetinaGuard_SimEvents_Day2';
load_system('d:\RetinaG\RetinaGuard_SimEvents\models\RetinaGuard_SimEvents_Day2.slx');
try
    disp('RandomNumberSeed:');
    disp(get_param(model_name, 'RandomNumberSeed'));
catch ME
    disp(ME.message);
end
close_system(model_name, 0);
exit;
