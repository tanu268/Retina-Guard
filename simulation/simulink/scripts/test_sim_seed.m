model_name = 'test_sim_seed';
new_system(model_name);
load_system('sldelib');
add_block('sldelib/Entity Generator', [model_name '/Gen']);
set_param([model_name '/Gen'], 'TimeSource', 'MATLAB action');
act = sprintf('persistent init;\nif isempty(init)\n for i=1:sim_seed; rand(); end\n init=true;\nend\ndt = -0.5*log(rand());');
set_param([model_name '/Gen'], 'IntergenerationTimeAction', act);

add_block('sldelib/Entity Terminator', [model_name '/Term']);
add_line(model_name, 'Gen/1', 'Term/1');

assignin('base', 'sim_seed', 10);
simOut1 = sim(model_name, 'StopTime', '10');

assignin('base', 'sim_seed', 50);
simOut2 = sim(model_name, 'StopTime', '10');

disp('Success');
close_system(model_name, 0);
exit;
