function rg_quality_assessment(requestFile, responseFile)
%RG_QUALITY_ASSESSMENT  Gradeability gate (Blueprint Phase 2).
%
%   Response JSON:
%       .qualityGrade   char   'A' | 'B' | 'C'
%       .qualityScore   double in [0,1]
%       .gradeable      logical (false only for grade C)
%       .reasons        struct array with .code and .message
%                       codes must come from QUALITY_REASON_CODES in contracts.js
%       .metrics        struct: focusScore, illuminationUniformity, contrast, fieldCoverage
%
%   Safety rule: refusing an unreadable image is a correct outcome. Never widen
%   the acceptance band to reduce the refusal rate without measuring the effect
%   on disease-positive images (risk register: "quality gate rejects disease").

    t0 = tic;
    try
        req = jsondecode(fileread(requestFile));
        % TODO(P2): implement focus/illumination/field-coverage metrics.
        error('rg_quality_assessment:NotImplemented', 'Quality subsystem pending Phase 2.');
    catch ME
        res = struct('error', ME.message, 'durationMs', toc(t0) * 1000);
        fid = fopen(responseFile, 'w'); fwrite(fid, jsonencode(res)); fclose(fid);
    end
end
