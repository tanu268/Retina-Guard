model_name = 'test_extrinsic';
new_system(model_name);
load_system('sldelib');
add_block('sldelib/Entity Generator', [model_name '/Gen']);
set_param([model_name '/Gen'], 'TimeSource', 'MATLAB action');
set_param([model_name '/Gen'], 'IntergenerationTimeAction', 'coder.extrinsic(''rand''); dt = -0.5 * log(rand());');
try
    sim(model_name, 'StopTime', '10');
    disp('Sim succeeded with coder.extrinsic');
catch ME
    disp(ME.message);
end
close_system(model_name, 0);
exit;
