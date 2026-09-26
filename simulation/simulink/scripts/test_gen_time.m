model_name = 'test_gen_time';
new_system(model_name);
load_system('sldelib');
add_block('sldelib/Entity Generator', [model_name '/Gen']);

fprintf('Allowed values for TimeSource: %s\n', get_param([model_name '/Gen'], 'TimeSource'));
% Try to get enumerated values if possible
try
    dialogs = get_param([model_name '/Gen'], 'DialogParameters');
    disp(dialogs.TimeSource.Enum);
catch ME
    disp(ME.message);
end

close_system(model_name, 0);
exit;
