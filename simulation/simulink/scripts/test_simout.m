% Test how to read from simOut
addpath('..\models');
assignin('base', 'effective_cap_svc_t', 5/(1-0.15));
assignin('base', 'ai_svc_t', 3);
assignin('base', 'reviewer_svc_t', 3);
assignin('base', 'capture_capacity', 10);
assignin('base', 'reviewer_capacity', 2);

simOut = sim('RetinaGuard_SimEvents_Day2', 'StopTime', '10');

disp('simOut variables:');
disp(simOut.who());

if isprop(simOut, 'stat_term_departed')
    ts = simOut.stat_term_departed;
    disp('stat_term_departed found as direct property.');
    disp(class(ts));
else
    disp('stat_term_departed NOT found as direct property. Checking yout...');
    if isprop(simOut, 'yout')
        disp(simOut.yout.getElementNames());
    end
end

exit;
