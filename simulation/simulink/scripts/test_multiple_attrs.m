model_name = 'test_attrs';
new_system(model_name);
load_system('sldelib');
add_block('sldelib/Entity Generator', [model_name '/Gen']);
add_block('sldelib/Entity Terminator', [model_name '/Term']);
add_line(model_name, 'Gen/1', 'Term/1');

% Try setting GenerateAction to create multiple attributes
set_param([model_name '/Gen'], 'GenerateAction', 'entity.AIResult = 0; entity.Attempts = 0;');

try
    sim(model_name);
    fprintf('SUCCESS using GenerateAction\n');
catch ME
    fprintf('FAILED using GenerateAction: %s\n', ME.message);
end

% Try comma separated
try
    set_param([model_name '/Gen'], 'GenerateAction', '');
    set_param([model_name '/Gen'], 'AttributeName', 'AIResult, Attempts');
    set_param([model_name '/Gen'], 'AttributeInitialValue', '0, 0');
    sim(model_name);
    fprintf('SUCCESS using Comma-separated\n');
catch ME
    fprintf('FAILED using Comma-separated: %s\n', ME.message);
end

close_system(model_name, 0);
exit;
