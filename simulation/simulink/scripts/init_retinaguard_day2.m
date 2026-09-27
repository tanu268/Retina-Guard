% init_retinaguard_day2.m
% Initialization script for RetinaGuard SimEvents Day 2 model

% 1. Load/define the documented simulation parameters
% These values match the S1_Baseline scenario from run_experiments.m
% and the base-workspace parameters set in build_day2.m
p_poor            = 0.15;
p_normal          = 0.70;
p_referable       = 0.20;
p_uncertain       = 0.10;

capture_capacity  = 10;
capture_svc_t     = 5;
ai_svc_t          = 3;
reviewer_capacity = 2;
reviewer_svc_t    = 3;

% 2. Load/create PatientBus
% Extracted from build_day2.m and run_experiments.m
clear elems;
elems(1) = Simulink.BusElement; elems(1).Name = 'AIResult'; elems(1).DataType = 'double';
elems(2) = Simulink.BusElement; elems(2).Name = 'Attempts'; elems(2).DataType = 'double';
elems(3) = Simulink.BusElement; elems(3).Name = 'Quality'; elems(3).DataType = 'double';
PatientBus = Simulink.Bus;
PatientBus.Elements = elems;
assignin('base', 'PatientBus', PatientBus);

% 3. Set sim_seed
% Fallback default seed if not defined by the experiment runner
if ~exist('sim_seed', 'var')
    sim_seed = 42;
end
rng(sim_seed);
