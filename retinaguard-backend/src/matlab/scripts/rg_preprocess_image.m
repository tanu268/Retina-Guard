function rg_preprocess_image(requestFile, responseFile)
%RG_PREPROCESS_IMAGE  Conservative preprocessing: circular crop, CLAHE, resize (Phase 3).
%
%   Request/response are JSON files, not stdout: MATLAB licence banners and
%   warnings pollute stdout in the field. Shapes are frozen in
%   src/matlab/contracts.js. On failure write {"error":"<message>"} and nothing
%   else — a partial result must never become a clinical grade.
%
%   Team DrigShift · SIH 2026 · PS 26038

    t0 = tic;
    try
        req = jsondecode(fileread(requestFile));
        error('rg_preprocess_image:NotImplemented', 'Stage pending implementation; keep MATLAB_ADAPTER=mock.');
    catch ME
        res = struct('error', ME.message, 'identifier', ME.identifier, ...
                     'durationMs', toc(t0) * 1000);
        fid = fopen(responseFile, 'w'); fwrite(fid, jsonencode(res)); fclose(fid);
    end
end
