% Start Simulink and load SimEvents library
load_system('sldelib');

% Find all blocks inside the sldelib library
blks = find_system('sldelib', 'Type', 'block');

% Display the blocks so I can read their exact paths
for i = 1:length(blks)
    disp(blks{i});
end

% Exit to return control to CLI
exit;
