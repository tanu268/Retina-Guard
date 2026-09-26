% Test which Server action hook allows entity attribute modification
load_system('sldelib');
new_system('TempTest2');

add_block('sldelib/Entity Generator', 'TempTest2/G');
set_param('TempTest2/G', 'AttributeName', 'AIResult');
set_param('TempTest2/G', 'AttributeInitialValue', '0');

add_block('sldelib/Entity Server', 'TempTest2/S');

% Wire them up
add_line('TempTest2', 'G/1', 'S/1');

% Test 1: EntryAction
set_param('TempTest2/S', 'EntryAction', 'entity.AIResult = 1;');
set_param('TempTest2', 'StopTime', '1');
try
    sim('TempTest2');
    disp('EntryAction: ALLOWED');
catch ME
    fprintf('EntryAction: FAILED (%s)\n', ME.message);
end

% Test 2: ServiceCompleteAction
set_param('TempTest2/S', 'EntryAction', '');
set_param('TempTest2/S', 'ServiceCompleteAction', 'entity.AIResult = 1;');
try
    sim('TempTest2');
    disp('ServiceCompleteAction: ALLOWED');
catch ME
    fprintf('ServiceCompleteAction: FAILED (%s)\n', ME.message);
end

close_system('TempTest2', 0);
exit;
