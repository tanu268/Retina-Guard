m = 'test_einswitch';
new_system(m);
load_system('sldelib');
add_block('sldelib/Entity Input Switch', [m '/EIS']);
dp = get_param([m '/EIS'], 'DialogParameters');
disp(fieldnames(dp));
close_system(m, 0);
exit;
