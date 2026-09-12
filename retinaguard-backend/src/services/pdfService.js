'use strict';
const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { config } = require('../config');
const logger = require('../utils/logger');
const { SCREENING_DISCLAIMER, PRIORITY } = require('../config/constants');

const INK = {
  text: '#12263a', muted: '#5b6b7c', rule: '#d7dee6',
  brand: '#0b6e6e', warn: '#b45309', urgent: '#b91c1c', ok: '#15803d',
};

/**
 * Renders the printable screening report.
 *
 * Two constraints shape the layout:
 *  - Colour is never the sole carrier of meaning (colourblind accessibility):
 *    every priority band is also spelled out in text.
 *  - No wording implies a diagnosis. The reviewer's decision is presented as
 *    the authoritative outcome and the AI output is labelled as assistance.
 */
class PdfService {
  constructor({ storageService } = {}) { this.storageService = storageService; }

  static priorityColour(priority) {
    return { [PRIORITY.P0]: INK.urgent, [PRIORITY.P1]: INK.warn, [PRIORITY.P2]: INK.warn, [PRIORITY.P3]: INK.ok }[priority] || INK.muted;
  }

  static priorityText(priority) {
    return {
      [PRIORITY.P0]: 'P0 — Urgent review',
      [PRIORITY.P1]: 'P1 — Referral review',
      [PRIORITY.P2]: 'P2 — Uncertain, careful review',
      [PRIORITY.P3]: 'P3 — Routine confirmatory review',
    }[priority] || 'Unassigned';
  }

  /**
   * @param {object} report  report row (payload already parsed)
   * @param {string} outputPath absolute destination
   * @returns {Promise<string>} outputPath
   */
  async render(report, outputPath) {
    const body = typeof report.payload === 'string' ? JSON.parse(report.payload) : (report.payload || {});
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const doc = new PDFDocument({ size: 'A4', margin: 48, info: {
      Title: `RetinaGuard screening report ${report.report_number}`,
      Author: config.appName || 'RetinaGuard', 
      Subject: 'AI-assisted diabetic retinopathy screening report',
      CreationDate: new Date(),
    } });

    const done = new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    });

    this.header(doc, report, body);
    this.patientBlock(doc, body);
    this.findingBlock(doc, body);
    await this.imagesBlock(doc, body);
    this.explanationBlock(doc, body);
    this.reviewBlock(doc, body);
    await this.footer(doc, report, body);

    doc.end();
    return done;
  }

  header(doc, report, body) {
    doc.fillColor(INK.brand).fontSize(20).font('Helvetica-Bold')
      .text('RetinaGuard', { continued: true })
      .fillColor(INK.muted).fontSize(11).font('Helvetica')
      .text('   AI-assisted diabetic retinopathy screening');
    doc.moveDown(0.2);
    doc.fillColor(INK.text).fontSize(9)
      .text(`Report ${report.report_number}`, { continued: true })
      .fillColor(INK.muted)
      .text(`   ·   ${body?.facility?.name || config?.node?.facilityName || 'RetinaGuard'}   ·   Generated ${new Date(report.generated_at).toLocaleString('en-IN')}`);
    doc.moveDown(0.6);
    this.rule(doc);
  }

  rule(doc) {
    doc.strokeColor(INK.rule).lineWidth(1)
      .moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.moveDown(0.6);
  }

  sectionTitle(doc, title) {
    doc.moveDown(0.4).fillColor(INK.brand).font('Helvetica-Bold').fontSize(11).text(title.toUpperCase());
    doc.moveDown(0.25).fillColor(INK.text).font('Helvetica').fontSize(10);
  }

  /**
   * Two-column key/value grid. Row height is measured from the rendered text
   * rather than fixed, so a long value (a village name, a reviewer note) pushes
   * the following row down instead of overlapping it.
   */
  keyValues(doc, pairs, columns = 2) {
    const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = usable / columns;
    const cellWidth = colWidth - 14;
    let y = doc.y;

    for (let i = 0; i < pairs.length; i += columns) {
      const row = pairs.slice(i, i + columns);
      let rowHeight = 0;

      row.forEach(([label, value], col) => {
        const x = doc.page.margins.left + col * colWidth;
        const text = value === null || value === undefined || value === '' ? '—' : String(value);
        doc.fillColor(INK.muted).fontSize(8).text(String(label).toUpperCase(), x, y, { width: cellWidth });
        const labelH = doc.heightOfString(String(label).toUpperCase(), { width: cellWidth });
        doc.fillColor(INK.text).fontSize(10).text(text, x, y + labelH + 2, { width: cellWidth });
        const valueH = doc.heightOfString(text, { width: cellWidth });
        rowHeight = Math.max(rowHeight, labelH + valueH + 10);
      });

      y += rowHeight;
      // Start a new page before a row would run off the bottom margin.
      if (y > doc.page.height - doc.page.margins.bottom - 60) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    }
    doc.y = y + 2;
  }

  patientBlock(doc, body) {
    const p = body.patient || {};
    const c = body.case || {};

    this.sectionTitle(doc, 'Patient information');
    this.keyValues(doc, [
      ['Patient ID', p.code],
      ['Patient name', p.name],
      ['Age / Gender', `${p.ageYears ?? '\u2014'} / ${PdfService.titleCase(p.sex)}`],
      ['Phone number', p.phone],
      ['State', p.state],
      ['District', p.district],
      ['Village', p.village],
      ['Screening date', c.createdAt ? new Date(c.createdAt).toLocaleString('en-IN') : '\u2014'],
    ]);

    this.sectionTitle(doc, 'Clinical information');

    // Duration and HbA1c appear only when diabetes history is 'yes'. For 'no'
    // or 'unknown' they are omitted rather than rendered as an em dash: a blank
    // HbA1c row on a clinical report reads as "tested, result missing", which
    // misrepresents what was actually recorded.
    const clinical = [
      ['Diabetes history', PdfService.titleCase(p.diabetesHistory)],
    ];
    if (p.diabetesHistory === 'yes') {
      clinical.push(['Duration of diabetes',
        p.diabetesDurationYears != null ? `${p.diabetesDurationYears} years` : 'Not recorded']);
      clinical.push(['HbA1c', p.hba1c != null ? `${p.hba1c}%` : 'Not recorded']);
    }
    clinical.push(['Eye screened', PdfService.lateralityText(body.image?.laterality)]);
    clinical.push(['Case number', c.caseNumber]);
    clinical.push(['Technician', c.technicianName]);
    this.keyValues(doc, clinical);
  }

  static titleCase(value) {
    if (!value) return '\u2014';
    return String(value).replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
  }

  static lateralityText(value) {
    return { left: 'Left eye (OS)', right: 'Right eye (OD)', both: 'Both eyes (OU)' }[value] || '\u2014';
  }

  findingBlock(doc, body) {
    this.sectionTitle(doc, 'AI-assisted screening output (not a diagnosis)');
    const a = body.analysis;

    // No analysis record exists yet for this case (report requested before
    // screening ran, or before a model is integrated on this node). This is
    // distinct from an abstention — nothing was attempted, so nothing failed.
    if (!a) {
      doc.fillColor(INK.muted).font('Helvetica-Bold').fontSize(11)
        .text('Pending AI Analysis');
      doc.fillColor(INK.text).font('Helvetica').fontSize(10)
        .text('Automated screening has not yet been performed for this case. '
          + 'The report will update once analysis is available, or the case may proceed to manual clinical review.');
      doc.moveDown(0.3);
      return;
    }

    if (a.abstained) {
      const isPending = a.abstainReason === 'MODEL_NOT_INTEGRATED';
      doc.fillColor(isPending ? INK.muted : INK.warn).font('Helvetica-Bold').fontSize(11)
        .text(isPending ? 'Pending AI Analysis' : 'Model abstained — no suggested grade');
      doc.fillColor(INK.text).font('Helvetica').fontSize(10)
        .text(
          isPending
            ? 'The diagnostic model has not yet been integrated on this node. This case requires manual grading by the reviewer; no automated grade is available.'
            : a.abstainReason === 'LOW_CONFIDENCE'
              ? 'Confidence fell below the configured abstention threshold. The case was routed to a human reviewer without a suggested grade.'
              : 'The pipeline could not produce a confident output. The case was routed to a human reviewer.',
        );
    } else {
      doc.fillColor(INK.text).font('Helvetica-Bold').fontSize(14).text(a.drGrade || '—');
      doc.font('Helvetica').fontSize(10).fillColor(INK.muted)
        .text(`ICDR grade ${a.drGradeCode} · calibrated confidence ${a.confidence != null ? (a.confidence * 100).toFixed(1) : '—'}%`
          + ` · P(referable) ${a.referableProbability != null ? (a.referableProbability * 100).toFixed(1) : '—'}%`);
    }
    doc.moveDown(0.4);
    // The triage priority is real even for a pending case — abstention always
    // routes to at least P1, so it is genuine information worth keeping. The
    // model-version line is not: printing a version string for a model that
    // never actually ran would misattribute the (absent) decision to it.
    doc.fillColor(PdfService.priorityColour(a.priority)).font('Helvetica-Bold').fontSize(10)
      .text(`Triage: ${PdfService.priorityText(a.priority)}`);
    if (a.abstainReason !== 'MODEL_NOT_INTEGRATED') {
      doc.fillColor(INK.muted).font('Helvetica').fontSize(9)
        .text(`Model ${a.modelVersion || '—'} · mode ${a.matlabMode || '—'} · image quality Grade ${body.image?.qualityGrade || '—'}`);
    }
    doc.moveDown(0.3);
  }

  async imagesBlock(doc, body) {
    const candidates = [
      ['Fundus image', body.image?.absolutePath],
      ['Grad-CAM (Layer 1)', body.explainability?.gradcamPath],
      ['Lesion evidence (Layer 2)', body.explainability?.lesionOverlayPath],
    ].filter(([, p]) => p && fs.existsSync(p));

    if (!candidates.length) {
      doc.fillColor(INK.muted).fontSize(9)
        .text('Image renditions are stored with the case record and were not embedded in this rendering.');
      return;
    }

    this.sectionTitle(doc, 'Retinal image and explanation overlays');
    const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const w = Math.min(150, usable / candidates.length - 10);
    const y = doc.y;
    candidates.forEach(([label, p], i) => {
      const x = doc.page.margins.left + i * (w + 12);
      try {
        doc.image(p, x, y, { fit: [w, w] });
      } catch (err) {
        logger.warn({ err: err.message, p }, 'Could not embed image in report');
      }
      doc.fillColor(INK.muted).fontSize(8).text(label, x, y + w + 4, { width: w });
    });
    doc.y = y + w + 22;
  }

  explanationBlock(doc, body) {
    const ex = body.explainability;
    if (!ex) return;
    this.sectionTitle(doc, 'Layered explanation');
    const lesionSummary = (ex.lesions || []).length
      ? ex.lesions.map((l) => `${l.type.replace(/_/g, ' ')} ×${l.count}`).join(', ')
      : 'No discrete lesions were detected by the evidence branch.';
    doc.fillColor(INK.text).fontSize(10)
      .text(`Layer 1 — attention region: ${ex.method || 'Grad-CAM'} overlay, agreement with lesion evidence ${ex.agreementScore != null ? (ex.agreementScore * 100).toFixed(0) : '—'}%.`)
      .text(`Layer 2 — lesion evidence: ${lesionSummary}`)
      .text(`Layer 3 — anatomical context: optic disc ${ex.anatomy?.opticDisc ? 'localised' : 'not localised'}, `
        + `fovea ${ex.anatomy?.fovea ? 'localised' : 'not localised'}, `
        + `vessel coverage ${ex.anatomy?.vessels?.coveragePercent ?? '—'}%.`);
    if (ex.disagreementFlag) {
      doc.moveDown(0.2).fillColor(INK.warn).font('Helvetica-Bold').fontSize(9)
        .text('Flag: attention region and lesion evidence disagree. Reviewer attention requested.')
        .font('Helvetica').fillColor(INK.text);
    }
  }

  reviewBlock(doc, body) {
    this.sectionTitle(doc, 'Human reviewer decision (authoritative)');
    const r = body.review;
    if (!r) {
      doc.fillColor(INK.warn).fontSize(10)
        .text('Awaiting human review. This report is provisional and carries no screening outcome.');
      return;
    }
    this.keyValues(doc, [
      ['Reviewer', `${r.reviewerName}${r.registrationNo ? ` (${r.registrationNo})` : ''}`],
      ['Decision', r.decision],
      ['Final grade', r.finalGrade || '—'],
      ['Outcome', r.referralOutcome || '—'],
      ['Reviewed at', r.reviewedAt ? new Date(r.reviewedAt).toLocaleString('en-IN') : '—'],
      ['Agreement with AI output', r.agreedWithAi === null || r.agreedWithAi === undefined ? '—' : (r.agreedWithAi ? 'Agreed' : 'Overridden')],
    ]);
    if (r.notes) {
      doc.fillColor(INK.muted).fontSize(8).text('REVIEWER NOTES');
      doc.fillColor(INK.text).fontSize(10).text(r.notes, { width: doc.page.width - 96 });
    }
  }

  async footer(doc, report, body) {
    doc.moveDown(0.8);
    this.rule(doc);
    const qrData = body.verification?.url
      || `${config.sync.districtUrl}/reports/verify/${report.verification_code}`;
    try {
      const png = await QRCode.toBuffer(qrData, { margin: 0, width: 220 });
      doc.image(png, doc.page.width - doc.page.margins.right - 76, doc.y, { fit: [76, 76] });
    } catch (err) {
      logger.warn({ err: err.message }, 'QR generation failed; report rendered without QR');
    }
    doc.fillColor(INK.muted).fontSize(8)
      .text(`Verification code ${report.verification_code}`, doc.page.margins.left, doc.y, { width: 340 })
      .text(`Report schema ${report.schema_version} · node ${config?.node?.id} · report hash chain recorded in the case audit trail`, { width: 340 })
      .moveDown(0.4)
      .text(SCREENING_DISCLAIMER, { width: 340 });
  }
}

module.exports = PdfService;
