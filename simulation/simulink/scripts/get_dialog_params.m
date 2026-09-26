% Find exact stat param names
load_system('sldelib');
new_system('TempParams');

add_block('sldelib/Entity Terminator', 'TempParams/T');
add_block('sldelib/Entity Queue', 'TempParams/Q');

fprintf('=== Terminator ===\n');
disp(fieldnames(get_param('TempParams/T', 'DialogParameters')));

fprintf('=== Queue ===\n');
disp(fieldnames(get_param('TempParams/Q', 'DialogParameters')));

close_system('TempParams', 0);
exit;
