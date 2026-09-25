'use strict';
const asyncHandler = require('../../utils/asyncHandler');

function buildReportsController({ reportService }) {
  const generate = asyncHandler(async (req, res) => {
    const variant = req.query.variant === 'patient' ? 'patient' : 'clinical';
    const report = await reportService.generate(req.params.consultationId, req.user, req, variant);
    res.status(201).json({ report: { ...report, json_payload: undefined } });
  });

  const getJson = asyncHandler(async (req, res) => {
    const report = await reportService.getJson(req.params.consultationId);
    res.status(200).json({ report: report.json_payload, meta: {
      reportNumber: report.report_number, status: report.status, generatedAt: report.generated_at,
    } });
  });

  /**
   * `?download=1` forces a save dialog; default is inline preview.
   * Supports `?variant=clinical` (default) and `?variant=patient`.
   */
  const getPdf = asyncHandler(async (req, res) => {
    const variant = req.query.variant === 'patient' ? 'patient' : 'clinical';
    const { stream, filename } = await reportService.getPdfStream(req.params.consultationId, variant);
    const disposition = req.query.download === undefined ? 'inline' : 'attachment';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    stream.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ error: { code: 'REPORT_STREAM_FAILED', message: err.message } });
      else res.destroy(err);
    });
    stream.pipe(res);
  });

  const verify = asyncHandler(async (req, res) => {
    const result = await reportService.verifyByQrToken(req.params.token);
    res.status(200).json(result);
  });

  return { generate, getJson, getPdf, verify };
}

module.exports = buildReportsController;
