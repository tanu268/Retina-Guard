m = 'test_eos_params';
new_system(m);
load_system('sldelib');
add_block('sldelib/Entity Output Switch', [m '/EOS']);
dp = get_param([m '/EOS'], 'DialogParameters');
disp(fieldnames(dp));
close_system(m, 0);
exit;
