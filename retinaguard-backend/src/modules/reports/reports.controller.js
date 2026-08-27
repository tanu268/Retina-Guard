'use strict';
const asyncHandler = require('../../utils/asyncHandler');

function buildReportsController({ reportService }) {
  const generate = asyncHandler(async (req, res) => {
    const report = await reportService.generate(req.params.consultationId, req.user, req);
    res.status(201).json({ report: { ...report, json_payload: undefined } });
  });

  const getJson = asyncHandler(async (req, res) => {
    const report = await reportService.getJson(req.params.consultationId);
    res.status(200).json({ report: report.json_payload, meta: {
      reportNumber: report.report_number, status: report.status, generatedAt: report.generated_at,
    } });
  });

  const getPdf = asyncHandler(async (req, res) => {
    const { stream, report } = await reportService.getPdfStream(req.params.consultationId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${report.report_number}.pdf"`);
    stream.pipe(res);
  });

  const verify = asyncHandler(async (req, res) => {
    const result = await reportService.verifyByQrToken(req.params.token);
    res.status(200).json(result);
  });

  return { generate, getJson, getPdf, verify };
}

module.exports = buildReportsController;
