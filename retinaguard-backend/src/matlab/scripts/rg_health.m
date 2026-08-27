function rg_health(requestFile, responseFile)
%RG_HEALTH  Liveness probe used by GET /health/matlab.
    res = struct('matlabVersion', version, 'toolboxes', {{ver('images').Name}}, 'ok', true);
    fid = fopen(responseFile, 'w'); fwrite(fid, jsonencode(res)); fclose(fid);
end
