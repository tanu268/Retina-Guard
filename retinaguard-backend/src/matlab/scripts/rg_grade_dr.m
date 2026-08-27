function rg_grade_dr(requestFile, responseFile)
%RG_GRADE_DR  Ordinal DR grading entry point for the Node backend.
%
%   Request JSON:
%       .imagePath      char   absolute path to the preprocessed image
%       .sha256         char   source image digest (for audit)
%       .qualityGrade   char   'A' | 'B'
%
%   Response JSON (must match src/matlab/contracts.js):
%       .drGradeCode           int    0..4 (ICDR)
%       .drGrade               char   'No Apparent DR' | 'Mild NPDR' | ...
%       .gradeProbabilities    1x5 double, sums to 1
%       .confidence            double in [0,1]
%       .referableProbability  double = sum(p(3:5))
%       .referable             logical
%       .modelVersion          char
%       .modelHash             char
%       .durationMs            double
%
%   Any failure must write {"error":"<message>"} — never a partial grade.
%   Team DrigShift · SIH 2026 · PS 26038

    t0 = tic;
    try
        req = jsondecode(fileread(requestFile));

        % ---------------------------------------------------------------
        % TODO(P5): load the frozen artefact and run inference.
        %   net   = coder.loadDeepLearningNetwork('models/retinaguard_effnetb0_512.mat');
        %   img   = imread(req.imagePath);
        %   logits = predict(net, img);
        %   probs  = rg_corn_to_probabilities(logits);      % ordinal head
        %   probs  = rg_apply_temperature(probs, T);        % calibration
        % ---------------------------------------------------------------
        error('rg_grade_dr:NotImplemented', ...
              'Model artefact not yet frozen. Keep MATLAB_ADAPTER=mock until Phase 5 completes.');

    catch ME
        res = struct('error', ME.message, 'identifier', ME.identifier, ...
                     'durationMs', toc(t0) * 1000);
        fid = fopen(responseFile, 'w');
        fwrite(fid, jsonencode(res));
        fclose(fid);
    end
end
