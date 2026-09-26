function build_day2()
    % =========================================================
    % RetinaGuard SimEvents - Day 2 Model Builder (Phase 5 Remediation)
    %
    % Topology (Phase 5):
    %
    %   Generator ─────────────────────────────────────────────┐
    %                                                           ▼
    %   [Quality Switch/2 (Poor, attempt<2)] → [Recapture Merge] → Patient Queue
    %                                                                     │
    %                                                               Capture Server
    %                                                                     │ (ExitAction: set Quality)
    %                                                             [Quality Switch]
    %                                                       ┌────┤1=Good   2=Poor   3=Fallback ├───┐
    %                                                       ▼                                       ▼
    %                                                      AI                              [Review Merge]
    %                                              (EntryAction: set AIResult)                      │
    %                                                  [AI Switch]                                  ▼
    %                                      1=Normal  2=Referable  3=Uncertain         Reviewer Queue → Reviewer → Terminator
    %                                          │           └────────────────────────→ [Review Merge]
    %                                          ▼
    %                                      Normal Exit
    %
    % Bus Object: PatientBus { AIResult, Attempts, Quality }
    % Stochastic arrivals: exponential interarrival dt = -0.5*log(rand())
    % Physical recapture: max 2 attempts before fallback to Reviewer
    % 3-way AI triage: Normal (1), Referable (2), Uncertain (3)
    %
    % Assumptions documented:
    %   [ASSUMPTION-D2] p_poor referenced in ExitAction from base workspace
    %   [ASSUMPTION-D3] p_normal, p_referable from base workspace in build;
    %                   literals embedded per scenario in run_experiments.m
    % =========================================================
    model_name = 'RetinaGuard_SimEvents_Day2';
    day1_name  = 'RetinaGuard_SimEvents_Day1_Verified';
    models_dir = fullfile(fileparts(mfilename('fullpath')), '..', 'models');

    addpath(models_dir);
    load_system('sldelib');

    %% ---- Load Day 1 -> save as Day 2 ----
    try close_system(model_name, 0); catch; end
    try close_system(day1_name,  0); catch; end
    load_system(day1_name);
    save_system(day1_name, fullfile(models_dir, [model_name '.slx']));
    close_system(day1_name, 0);
    load_system(model_name);

    %% ---- Base-Workspace Parameters ----
    assignin('base', 'p_poor',            0.15);
    assignin('base', 'p_normal',          0.70);
    assignin('base', 'p_referable',       0.20);
    assignin('base', 'p_uncertain',       0.10);
    assignin('base', 'capture_capacity',  10);
    assignin('base', 'capture_svc_t',      5);
    assignin('base', 'ai_svc_t',           3);
    assignin('base', 'reviewer_capacity',  2);
    assignin('base', 'reviewer_svc_t',     3);

    %% ---- Define Bus Object ----
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

    %% ---- STEP 1: Configure Generator (Bus + stochastic interarrival) ----
    set_param([model_name '/Generator'], 'EntityType',     'Bus object');
    set_param([model_name '/Generator'], 'EntityTypeName', 'PatientBus');
    set_param([model_name '/Generator'], 'TimeSource',     'MATLAB action');
    gen_act = sprintf(['persistent init;\nif isempty(init)\n' ...
              '    seed = sim_seed;\n' ...
              '    for i=1:seed; rand(); end\n' ...
              '    init = true;\nend\n' ...
              'dt = -0.5 * log(rand());']);
    set_param([model_name '/Generator'], 'IntergenerationTimeAction', gen_act);
    set_param([model_name '/Generator'], 'GenerateAction', ...
              'entity.AIResult = 0; entity.Attempts = 0; entity.Quality = 1;');

    %% ---- STEP 2: Break Generator -> Patient Queue ----
    % Day 1 had: Generator/1 -> Patient Queue/1
    % We insert a Recapture Merge node between them.
    delete_line(model_name, 'Generator/1', 'Patient Queue/1');

    %% ---- STEP 3: Add Recapture Merge (Generator + Poor recapture -> Patient Queue) ----
    add_block('sldelib/Entity Input Switch', ...
        [model_name '/Recapture Merge'], 'Position', [150 100 210 140]);
    set_param([model_name '/Recapture Merge'], 'NumberInputPorts', '2');

    add_line(model_name, 'Generator/1',       'Recapture Merge/1', 'autorouting', 'on');
    add_line(model_name, 'Recapture Merge/1', 'Patient Queue/1',   'autorouting', 'on');
    % Recapture Merge/2 will be connected from Quality Switch/2 after that block is added

    %% ---- STEP 4: Capture Server ----
    set_param([model_name '/Capture Server'], 'Capacity',          'capture_capacity');
    set_param([model_name '/Capture Server'], 'ServiceTimeSource', 'Dialog');
    set_param([model_name '/Capture Server'], 'ServiceTimeValue',  'capture_svc_t');
    set_param([model_name '/Capture Server'], 'ExitAction', '');

    %% ---- STEP 5: Break Capture Server -> AI, insert Quality Assess + Quality Switch ----
    delete_line(model_name, 'Capture Server/1', 'AI/1');

    % Zero-service-time server: only used to run EntryAction (set Quality, Attempts)
    % Entity Server EntryAction IS allowed to modify attributes (unlike ExitAction)
    add_block('sldelib/Entity Server', ...
        [model_name '/Quality Assess'], 'Position', [490 100 570 140]);
    set_param([model_name '/Quality Assess'], 'Capacity',          'Inf');
    set_param([model_name '/Quality Assess'], 'ServiceTimeSource', 'Dialog');
    set_param([model_name '/Quality Assess'], 'ServiceTimeValue',  '0');
    qual_logic = sprintf(['persistent init;\nif isempty(init)\n' ...
                          '    seed = sim_seed + 1000;\n' ...
                          '    for i=1:seed; rand(); end\n' ...
                          '    init = true;\nend\n' ...
                          'entity.Attempts = entity.Attempts + 1;' newline ...
                          'if entity.Attempts >= 2' newline ...
                          '    entity.Quality = 3;' newline ...
                          'elseif rand() < p_poor' newline ...
                          '    entity.Quality = 2;' newline ...
                          'else' newline ...
                          '    entity.Quality = 1;' newline ...
                          'end']);
    set_param([model_name '/Quality Assess'], 'EntryAction', qual_logic);

    add_block('sldelib/Entity Output Switch', ...
        [model_name '/Quality Switch'], 'Position', [600 100 660 140]);
    set_param([model_name '/Quality Switch'], 'NumberOutputPorts',  '3');
    set_param([model_name '/Quality Switch'], 'SwitchingCriterion', 'From attribute');
    set_param([model_name '/Quality Switch'], 'SwitchAttributeName','Quality');

    add_line(model_name, 'Capture Server/1',  'Quality Assess/1',  'autorouting', 'on');
    add_line(model_name, 'Quality Assess/1',  'Quality Switch/1',  'autorouting', 'on');
    add_line(model_name, 'Quality Switch/1',  'AI/1',              'autorouting', 'on'); % Good -> AI
    add_line(model_name, 'Quality Switch/2',  'Recapture Merge/2', 'autorouting', 'on'); % Poor -> recapture

    %% ---- STEP 6: Add Review Merge (3 inputs: Referable, Uncertain, Fallback) ----
    add_block('sldelib/Entity Input Switch', ...
        [model_name '/Review Merge'], 'Position', [870 190 930 230]);
    set_param([model_name '/Review Merge'], 'NumberInputPorts', '3');

    % Connect Review Merge -> Reviewer Queue (break existing AI->Reviewer Queue first)
    delete_line(model_name, 'AI/1', 'Reviewer Queue/1');
    add_line(model_name, 'Review Merge/1', 'Reviewer Queue/1', 'autorouting', 'on');

    % Quality Switch/3 (Fallback) → Review Merge/3
    add_line(model_name, 'Quality Switch/3', 'Review Merge/3', 'autorouting', 'on');

    %% ---- STEP 7: AI Server (default action; literal probs embedded per run) ----
    ai_entry = sprintf(['r = rand();' newline ...
                       'if r < p_normal' newline ...
                       '    entity.AIResult = 1;' newline ...
                       'elseif r < p_normal + p_referable' newline ...
                       '    entity.AIResult = 2;' newline ...
                       'else' newline ...
                       '    entity.AIResult = 3;' newline ...
                       'end']);
    set_param([model_name '/AI'], 'EntryAction',       ai_entry);
    set_param([model_name '/AI'], 'ServiceTimeSource', 'Dialog');
    set_param([model_name '/AI'], 'ServiceTimeValue',  'ai_svc_t');

    %% ---- STEP 8: AI Output Switch (3-port) ----
    add_block('sldelib/Entity Output Switch', ...
        [model_name '/AI Switch'], 'Position', [690 190 750 230]);
    set_param([model_name '/AI Switch'], 'NumberOutputPorts',  '3');
    set_param([model_name '/AI Switch'], 'SwitchingCriterion', 'From attribute');
    set_param([model_name '/AI Switch'], 'SwitchAttributeName','AIResult');

    add_line(model_name, 'AI/1',         'AI Switch/1',    'autorouting', 'on');

    % AIResult=1 (Normal) → Normal Exit (bypass reviewer)
    add_block('sldelib/Entity Terminator', ...
        [model_name '/Normal Exit'], 'Position', [810 155 870 195]);
    add_line(model_name, 'AI Switch/1', 'Normal Exit/1',   'autorouting', 'on');

    % AIResult=2 (Referable) → Review Merge/1
    add_line(model_name, 'AI Switch/2', 'Review Merge/1',  'autorouting', 'on');
    % AIResult=3 (Uncertain) → Review Merge/2
    add_line(model_name, 'AI Switch/3', 'Review Merge/2',  'autorouting', 'on');

    %% ---- STEP 9: Reviewer Server ----
    set_param([model_name '/Reviewer Server'], 'Capacity',          'reviewer_capacity');
    set_param([model_name '/Reviewer Server'], 'ServiceTimeSource', 'Dialog');
    set_param([model_name '/Reviewer Server'], 'ServiceTimeValue',  'reviewer_svc_t');

    %% ---- Simulation settings ----
    set_param(model_name, 'StopTime', '480');
    set_param(model_name, 'InitFcn',  'rng(sim_seed);');

    %% ---- Save ----
    save_system(model_name, fullfile(models_dir, [model_name '.slx']));
    close_system(model_name, 0);
    fprintf('[OK] Day 2 model saved to: %s\n', fullfile(models_dir, [model_name '.slx']));
end
