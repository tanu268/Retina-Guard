function build_day2_stats()
    % Adds To Workspace blocks for the required metrics
    model_name = 'RetinaGuard_SimEvents_Day2';
    models_dir = fullfile(fileparts(mfilename('fullpath')), '..', 'models');
    addpath(models_dir);
    load_system(model_name);

    % Define patient arrival rate (e.g., 1 patient every 0.5 minutes = 120 per hour)
    % This ensures the system actually receives entities to process!
    % NOTE: Handled in build_day2.m (stochastic interarrival)

    % Helper function to add a To Workspace block and connect a stat port
    function add_stat_logging(block_path, stat_param, var_name, y_offset)
        try
            block_name = get_param(block_path, 'Name');
            
            % Enable the statistic port
            set_param(block_path, stat_param, 'on');
            
            % Find the newly added port. In SimEvents, statistical ports are typically added as the first port(s) (Port 1).
            ph = get_param(block_path, 'PortHandles');
            stat_port = ph.Outport(1);
            
            % Get block position to place To Workspace
            pos = get_param(block_path, 'Position');
            tw_pos = [pos(3)+20, pos(2)+y_offset, pos(3)+80, pos(2)+y_offset+30];
            
            tw_name = [block_name '_' var_name];
            tw_path = [model_name '/' tw_name];
            
            % Only add if it doesn't already exist
            if getSimulinkBlockHandle(tw_path) == -1
                add_block('simulink/Sinks/To Workspace', tw_path, 'Position', tw_pos);
                set_param(tw_path, 'VariableName', var_name);
                set_param(tw_path, 'SaveFormat', 'Timeseries');
                
                % Connect the port
                tw_ph = get_param(tw_path, 'PortHandles');
                add_line(model_name, stat_port, tw_ph.Inport(1), 'autorouting', 'on');
            end
        catch ME
            fprintf('Could not add stat %s to %s: %s\n', stat_param, block_path, ME.message);
        end
    end

    % Add stats (using verified param names)
    add_stat_logging([model_name '/Terminator'], 'NumberEntitiesArrived', 'stat_term_departed', 50);
    add_stat_logging([model_name '/Normal Exit'], 'NumberEntitiesArrived', 'stat_normal_departed', 50);
    
    add_stat_logging([model_name '/Capture Server'], 'Utilization', 'stat_cap_util', 50);
    add_stat_logging([model_name '/AI'], 'Utilization', 'stat_ai_util', 50);
    add_stat_logging([model_name '/Reviewer Server'], 'Utilization', 'stat_rev_util', 50);
    
    add_stat_logging([model_name '/Reviewer Queue'], 'AverageQueueLength', 'stat_rev_q_len', 50);
    add_stat_logging([model_name '/Reviewer Queue'], 'AverageWait', 'stat_rev_wait', 100);
    
    add_stat_logging([model_name '/Patient Queue'], 'AverageWait', 'stat_cap_wait', 50);

    save_system(model_name);
    close_system(model_name);
end
