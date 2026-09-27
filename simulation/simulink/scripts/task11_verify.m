% task11_verify.m
try
    bdclose('all');
    clearvars;
    clc;

    addpath('D:\RetinaGuard_SimEvents\models');
    addpath('D:\RetinaGuard_SimEvents\scripts');

    model = 'RetinaGuard_SimEvents_Day2';
    load_system(model);
    
    fprintf('=== STATISTICS BLOCKS ===\n');
    ws_blocks = find_system(model, 'BlockType', 'ToWorkspace');
    for i = 1:length(ws_blocks)
        blk = ws_blocks{i};
        pc = get_param(blk, 'PortConnectivity');
        isConnected = ~isempty(pc) && pc(1).SrcBlock ~= -1;
        if isConnected
            src = get_param(pc(1).SrcBlock, 'Name');
        else
            src = 'NONE';
        end
        varName = get_param(blk, 'VariableName');
        fprintf('ToWorkspace: %s -> Var: %s (Connected to: %s)\n', get_param(blk,'Name'), varName, src);
    end

    fprintf('=== SIMULATION RUN ===\n');
    simOut = sim(model, 'StopTime', '480');
    disp('Simulation finished.');
    
    fprintf('=== OUTPUT VARIABLES ===\n');
    vars = simOut.who;
    for i = 1:length(vars)
        v = vars{i};
        if ~strcmp(v, 'tout') && ~strcmp(v, 'SimulationMetadata') && ~strcmp(v, 'ErrorMessage')
            ts = simOut.get(v);
            if isa(ts, 'timeseries')
                d = squeeze(ts.Data);
                fprintf('%s: Data length = %d. Final value = %f, Mean value = %f\n', ...
                    v, length(d), d(end), mean(d));
            else
                fprintf('%s: Not a timeseries\n', v);
            end
        end
    end
    
    close_system(model, 0);
catch ME
    disp(ME.message);
end
