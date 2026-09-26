model_name = 'RetinaGuard_SimEvents_Day2';
addpath('..\models');
load_system(model_name);

blk = [model_name '/Capture Server'];
set_param(blk, 'Utilization', 'on');
ph = get_param(blk, 'PortHandles');

disp('PortHandles after turning Utilization on:');
disp(ph);

disp('Types of Outports:');
for i=1:length(ph.Outport)
    portObj = get_param(ph.Outport(i), 'Object');
    fprintf('Outport %d: Type = %s, Line = %f\n', i, portObj.PortType, portObj.Line);
end

close_system(model_name, 0);
exit;
