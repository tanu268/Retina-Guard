try
    load_system('sldelib');
    blocks = find_system('sldelib');
    for i = 1:length(blocks)
        if contains(lower(blocks{i}), 'switch') || contains(lower(blocks{i}), 'combiner') || contains(lower(blocks{i}), 'merge')
            disp(blocks{i});
        end
    end
catch ME
    disp(ME.message);
end
exit;
