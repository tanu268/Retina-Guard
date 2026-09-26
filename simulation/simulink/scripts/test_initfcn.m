model_name = 'test_rng_initfcn';
new_system(model_name);
load_system('sldelib');
add_block('sldelib/Entity Generator', [model_name '/Gen']);
set_param([model_name '/Gen'], 'TimeSource', 'MATLAB action');
set_param([model_name '/Gen'], 'IntergenerationTimeAction', 'dt = -0.5 * log(rand());');

% Add a terminator
add_block('sldelib/Entity Terminator', [model_name '/Term']);
add_line(model_name, 'Gen/1', 'Term/1');

% Set InitFcn
set_param(model_name, 'InitFcn', 'rng(sim_seed);');

for i = 1:2
    assignin('base', 'sim_seed', i);
    simOut = sim(model_name, 'StopTime', '10');
    disp(['Seed ' num2str(i) ' completed.']);
end
close_system(model_name, 0);
exit;
