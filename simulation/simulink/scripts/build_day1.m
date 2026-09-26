function build_day1()
    % =========================================================
    % RetinaGuard SimEvents - Day 1 Baseline Model Builder
    % Pipeline:
    %   Generator -> Patient Queue -> Capture Server
    %             -> AI Server
    %             -> Reviewer Queue -> Reviewer Server -> Terminator
    %
    % Entity Gate removed: it served no functional role in Day 1
    % (was always open). Direct wiring from Capture Server -> AI.
    % =========================================================
    model_name = 'RetinaGuard_SimEvents_Day1_Verified';
    models_dir = fullfile(fileparts(mfilename('fullpath')), '..', 'models');

    load_system('sldelib');

    %% ---- Create model ----
    try close_system(model_name, 0); catch; end
    new_system(model_name);
    open_system(model_name);

    %% ---- Add blocks (left-to-right layout) ----
    add_block('sldelib/Entity Generator',   [model_name '/Generator'],        'Position', [  50 100  130 140]);
    add_block('sldelib/Entity Queue',       [model_name '/Patient Queue'],    'Position', [ 220 100  300 140]);
    add_block('sldelib/Entity Server',      [model_name '/Capture Server'],   'Position', [ 390 100  470 140]);
    add_block('sldelib/Entity Server',      [model_name '/AI'],               'Position', [ 560 100  640 140]);
    add_block('sldelib/Entity Queue',       [model_name '/Reviewer Queue'],   'Position', [ 720 100  800 140]);
    add_block('sldelib/Entity Server',      [model_name '/Reviewer Server'],  'Position', [ 880 100  960 140]);
    add_block('sldelib/Entity Terminator',  [model_name '/Terminator'],       'Position', [1050 100 1130 140]);
    add_block('sldelib/Sequence Viewer',    [model_name '/Sequence Viewer'],  'Position', [  50 220  130 260]);

    %% ---- Configure blocks ----
    set_param([model_name '/Patient Queue'],    'Capacity',          '500');

    set_param([model_name '/Capture Server'],   'Capacity',          '10');
    set_param([model_name '/Capture Server'],   'ServiceTimeSource', 'Dialog');
    set_param([model_name '/Capture Server'],   'ServiceTimeValue',  '5');   % min [ASSUMPTION-A1]

    set_param([model_name '/AI'],               'Capacity',          '1');
    set_param([model_name '/AI'],               'ServiceTimeSource', 'Dialog');
    set_param([model_name '/AI'],               'ServiceTimeValue',  '3');   % min [ASSUMPTION-A2]

    set_param([model_name '/Reviewer Queue'],   'Capacity',          '500');

    set_param([model_name '/Reviewer Server'],  'Capacity',          '2');
    set_param([model_name '/Reviewer Server'],  'ServiceTimeSource', 'Dialog');
    set_param([model_name '/Reviewer Server'],  'ServiceTimeValue',  '3');   % min [ASSUMPTION-A3]

    %% ---- Wire connections ----
    add_line(model_name, 'Generator/1',       'Patient Queue/1',    'autorouting', 'on');
    add_line(model_name, 'Patient Queue/1',   'Capture Server/1',   'autorouting', 'on');
    add_line(model_name, 'Capture Server/1',  'AI/1',               'autorouting', 'on');
    add_line(model_name, 'AI/1',              'Reviewer Queue/1',   'autorouting', 'on');
    add_line(model_name, 'Reviewer Queue/1',  'Reviewer Server/1',  'autorouting', 'on');
    add_line(model_name, 'Reviewer Server/1', 'Terminator/1',       'autorouting', 'on');

    %% ---- Simulation settings ----
    set_param(model_name, 'StopTime', '480');

    %% ---- Save ----
    save_system(model_name, fullfile(models_dir, [model_name '.slx']));
    close_system(model_name, 0);
    fprintf('[OK] Day 1 model saved to: %s\n', fullfile(models_dir, [model_name '.slx']));
end
