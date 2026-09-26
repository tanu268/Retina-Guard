clear elems;
elems(1) = Simulink.BusElement;
elems(1).Name = 'AIResult';
elems(1).DataType = 'double';
elems(2) = Simulink.BusElement;
elems(2).Name = 'Attempts';
elems(2).DataType = 'double';
elems(3) = Simulink.BusElement;
elems(3).Name = 'Quality';
elems(3).DataType = 'double';
PatientBus = Simulink.Bus;
PatientBus.Elements = elems;
assignin('base', 'PatientBus', PatientBus);

model_name = 'test_bus_attr';
new_system(model_name);
load_system('sldelib');
add_block('sldelib/Entity Generator', [model_name '/Gen']);
add_block('sldelib/Entity Terminator', [model_name '/Term']);
add_line(model_name, 'Gen/1', 'Term/1');

set_param([model_name '/Gen'], 'EntityType', 'Bus object');
set_param([model_name '/Gen'], 'EntityTypeName', 'PatientBus');
set_param([model_name '/Gen'], 'GenerateAction', 'entity.AIResult=0; entity.Attempts=0; entity.Quality=1;');

try
    sim(model_name);
    fprintf('SUCCESS using Bus Object\n');
catch ME
    fprintf('FAILED using Bus Object: %s\n', ME.message);
end

close_system(model_name, 0);
exit;
