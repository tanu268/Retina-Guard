try
    load_system('sldelib');
    blocks = find_system('sldelib', 'SearchDepth', 1, 'BlockType', 'SubSystem');
    for i = 1:length(blocks)
        disp(blocks{i});
    end
catch ME
    disp(ME.message);
end
exit;
