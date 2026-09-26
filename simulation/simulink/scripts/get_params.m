% Deep-introspect Entity Generator mask to understand multi-attribute format
load_system('sldelib');
new_system('TempInspect3');

add_block('sldelib/Entity Generator', 'TempInspect3/G');

% Read ALL mask-related values (these control the attribute table)
fprintf('=== MaskValueString ===\n');
disp(get_param('TempInspect3/G', 'MaskValueString'));

fprintf('=== MaskNames ===\n');
disp(get_param('TempInspect3/G', 'MaskNames'));

fprintf('=== MaskValues (cell) ===\n');
mv = get_param('TempInspect3/G', 'MaskValues');
for i = 1:length(mv)
    fprintf('  [%d] = %s\n', i, mv{i});
end

fprintf('=== MaskPromptString ===\n');
disp(get_param('TempInspect3/G', 'MaskPromptString'));

fprintf('=== EntityType ===\n');
disp(get_param('TempInspect3/G', 'EntityType'));

fprintf('=== EntityTypeName ===\n');
disp(get_param('TempInspect3/G', 'EntityTypeName'));

fprintf('=== DataInitialValue ===\n');
disp(get_param('TempInspect3/G', 'DataInitialValue'));

close_system('TempInspect3', 0);
exit;
