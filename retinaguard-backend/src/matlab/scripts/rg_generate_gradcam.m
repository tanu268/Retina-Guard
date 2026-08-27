function rg_generate_gradcam(requestFile, responseFile)
%RG_GENERATE_GRADCAM  Layer-1 explanation: broad attention region.
%
%   Response JSON:
%       .heatmapPath    char   PNG written to req.outputPath
%       .targetLayer    char
%       .method         char   'grad-cam'
%       .regions        struct array (.x .y .w .h .intensity), normalised coords
%       .peakIntensity  double
%
%   A Grad-CAM map is supporting evidence, not proof. Layers 2 (lesion) and 3
%   (anatomy) exist precisely because attention maps can mislead.

    t0 = tic;
    try
        req = jsondecode(fileread(requestFile));
        % TODO(P3): gradCAM(net, img, classIdx, 'ReductionLayer', ...)
        error('rg_generate_gradcam:NotImplemented', 'Grad-CAM pending Phase 3.');
    catch ME
        res = struct('error', ME.message, 'durationMs', toc(t0) * 1000);
        fid = fopen(responseFile, 'w'); fwrite(fid, jsonencode(res)); fclose(fid);
    end
end
