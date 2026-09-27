% implement_task11.m
try
    bdclose('all');
    clearvars;
    clc;

    addpath('D:\RetinaGuard_SimEvents\models');
    model = 'RetinaGuard_SimEvents_Day2';
    load_system(model);

    % 1. Enable Generator depart stat
    set_param([model '/Generator'], 'NumberEntitiesDeparted', 'on');

    % Add Total Completed Sum
    add_block('simulink/Math Operations/Add', [model '/Total Completed Sum'], 'Position', [100 600 130 630]);
    set_param([model '/Total Completed Sum'], 'Inputs', '++');

    % Normal Exit and Terminator both terminate entities, so they have 0 entity output ports.
    % Thus their stat port is port 1.
    add_line(model, 'Normal Exit/1', 'Total Completed Sum/1', 'autorouting', 'on');
    add_line(model, 'Terminator/1', 'Total Completed Sum/2', 'autorouting', 'on');

    % Add Backlog Sum (+ -)
    add_block('simulink/Math Operations/Subtract', [model '/Backlog Sum'], 'Position', [300 600 330 630]);
    set_param([model '/Backlog Sum'], 'Inputs', '+-');

    % Generator has 1 entity output port (port 1).
    % The stat port will be port 2.
    add_line(model, 'Generator/2', 'Backlog Sum/1', 'autorouting', 'on');
    add_line(model, 'Total Completed Sum/1', 'Backlog Sum/2', 'autorouting', 'on');

    % Add Backlog ToWorkspace
    add_block('simulink/Sinks/To Workspace', [model '/stat_backlog'], 'Position', [400 600 450 630]);
    set_param([model '/stat_backlog'], 'VariableName', 'stat_backlog', 'SaveFormat', 'Timeseries');
    add_line(model, 'Backlog Sum/1', 'stat_backlog/1', 'autorouting', 'on');

    % Add Clock
    add_block('simulink/Sources/Clock', [model '/Clock'], 'Position', [100 700 130 730]);

    % Add Throughput Divide (* /)
    add_block('simulink/Math Operations/Divide', [model '/Throughput Divide'], 'Position', [300 700 330 730]);
    set_param([model '/Throughput Divide'], 'Inputs', '*/');

    % Connect Total Completed Sum and Clock to Divide
    add_line(model, 'Total Completed Sum/1', 'Throughput Divide/1', 'autorouting', 'on');
    add_line(model, 'Clock/1', 'Throughput Divide/2', 'autorouting', 'on');

    % Add Throughput ToWorkspace
    add_block('simulink/Sinks/To Workspace', [model '/stat_throughput'], 'Position', [400 700 450 730]);
    set_param([model '/stat_throughput'], 'VariableName', 'stat_throughput', 'SaveFormat', 'Timeseries');
    add_line(model, 'Throughput Divide/1', 'stat_throughput/1', 'autorouting', 'on');

    % Save model
    save_system(model);
    close_system(model, 0);
    disp('Modifications complete and saved.');

catch ME
    disp('ERROR:');
    disp(ME.message);
end
