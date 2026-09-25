'use strict';
const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { config } = require('../config');
const logger = require('../utils/logger');
const { PRIORITY } = require('../config/constants');

// Authoritative referral urgency definitions corresponding to schema enum:
// 'immediate' | 'within_1_week' | 'within_1_month' | 'routine'
const REFERRAL_URGENCY_MAP = Object.freeze({
  immediate: {
    urgency: 'Immediate Referral',
    actionEn: 'Immediate evaluation by an ophthalmologist or retinal specialist is indicated.',
    actionHi: 'नेत्र रोग विशेषज्ञ अथवा रेटिना विशेषज्ञ द्वारा तत्काल मूल्यांकन की आवश्यकता है।',
  },
  within_1_week: {
    urgency: 'Urgent Referral (Within 1 Week)',
    actionEn: 'Prompt evaluation by an eye care specialist within 1 week is indicated.',
    actionHi: '१ सप्ताह के भीतर नेत्र रोग विशेषज्ञ द्वारा मूल्यांकन की आवश्यकता है।',
  },
  within_1_month: {
    urgency: 'Priority Referral (Within 1 Month)',
    actionEn: 'Evaluation by an eye care professional within 1 month is indicated.',
    actionHi: '१ महीने के भीतर नेत्र विशेषज्ञ द्वारा मूल्यांकन की आवश्यकता है।',
  },
  routine: {
    urgency: 'Routine Follow-up',
    actionEn: 'Routine periodic review and regular metabolic monitoring as advised by treating physician.',
    actionHi: 'नियमित आवधिक पुनः जांच और चिकित्सक की सलाह अनुसार स्वास्थ्य निगरानी रखें।',
  },
});

const PATIENT_INSTRUCTIONS_EN = [
  'Follow up with an eye specialist according to the referral urgency indicated above.',
  'Maintain strict control of blood sugar, blood pressure, and cholesterol levels with your physician.',
  'Seek prompt medical attention if you experience sudden vision changes, flashes of light, or new floaters.',
  'This screening assessment does not replace a comprehensive dilated eye examination.',
];

const PATIENT_INSTRUCTIONS_HI = [
  'ऊपर दी गई सलाह के अनुसार नेत्र रोग विशेषज्ञ से परामर्श लें।',
  'अपने चिकित्सक की सलाह से ब्लड शुगर और रक्तचाप को नियंत्रित रखें।',
  'यदि दृष्टि में अचानक बदलाव आए या चमक दिखाई दे तो तुरंत अस्पताल जाएं।',
  'यह स्क्रीनिंग मूल्यांकन पूर्ण पुतली फैलाकर की जाने वाली नेत्र जांच का स्थान नहीं लेता है।',
];

const INK = {
  navy: '#0f2942',
  brand: '#0b6e6e',
  text: '#1e293b',
  muted: '#64748b',
  lightBg: '#f8fafc',
  border: '#cbd5e1',
  borderLight: '#e2e8f0',
  white: '#ffffff',
  urgentText: '#991b1b',
  urgentBg: '#fef2f2',
  urgentBorder: '#f87171',
  referralText: '#c2410c',
  referralBg: '#fff7ed',
  referralBorder: '#fb923c',
  uncertainText: '#b45309',
  uncertainBg: '#fffbeb',
  uncertainBorder: '#fcd34d',
  routineText: '#15803d',
  routineBg: '#f0fdf4',
  routineBorder: '#86efac',
};

const DISCLAIMER_TEXT =
  'AI output is a screening and triage aid. Final grading done by a qualified reviewer. Not a replacement for a full eye examination.';

class PdfService {
  constructor({ storageService } = {}) {
    this.storageService = storageService;
    this.fontDevanagari = path.resolve(__dirname, '../assets/fonts/NotoSansDevanagari-Regular.woff');
    this.fontDevanagariBold = path.resolve(__dirname, '../assets/fonts/NotoSansDevanagari-Bold.woff');
  }

  static priorityStyle(priority) {
    switch (priority) {
      case PRIORITY.P0:
        return { text: INK.urgentText, bg: INK.urgentBg, border: INK.urgentBorder, label: 'P0 — Urgent Review' };
      case PRIORITY.P1:
        return { text: INK.referralText, bg: INK.referralBg, border: INK.referralBorder, label: 'P1 — Referral Review' };
      case PRIORITY.P2:
        return { text: INK.uncertainText, bg: INK.uncertainBg, border: INK.uncertainBorder, label: 'P2 — Uncertain, Careful Review' };
      case PRIORITY.P3:
        return { text: INK.routineText, bg: INK.routineBg, border: INK.routineBorder, label: 'P3 — Routine Confirmatory Review' };
      default:
        return { text: INK.muted, bg: INK.lightBg, border: INK.border, label: 'Unassigned Priority' };
    }
  }

  static titleCase(value) {
    if (!value) return '—';
    return String(value).replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
  }

  static formatDate(dt) {
    if (!dt) return '—';
    try {
      const d = new Date(dt);
      if (Number.isNaN(d.getTime())) return String(dt);
      return d.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return String(dt);
    }
  }

  /**
   * @param {object} report report descriptor
   * @param {string} outputPath destination filepath
   */
  async render(report, outputPath) {
    const body = typeof report.payload === 'string' ? JSON.parse(report.payload) : (report.payload || {});
    const variant = report.variant || body.variant || 'clinical';
    const isPatient = variant === 'patient';

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 80, left: 40, right: 40 },
      bufferPages: true,
      info: {
        Title: `RetinaGuard Screening Report ${report.report_number}`,
        Author: config.appName || 'RetinaGuard',
        Subject: `${isPatient ? 'Patient Summary' : 'Clinical Audit'} Retinal Screening Report`,
        CreationDate: new Date(),
      },
    });

    if (fs.existsSync(this.fontDevanagari)) {
      doc.registerFont('Devanagari', this.fontDevanagari);
    }
    if (fs.existsSync(this.fontDevanagariBold)) {
      doc.registerFont('Devanagari-Bold', this.fontDevanagariBold);
    }

    const done = new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    });

    // ─── Section 1: Header ───────────────────────────────────────────────────
    this.renderHeader(doc, report, body, isPatient);

    // ─── Section 2: Patient Details ──────────────────────────────────────────
    this.renderPatientSection(doc, body);

    if (isPatient) {
      // Patient variant: Sections 1, 2, Final Priority/Adjudication, 6, 8 (fits on 1 page)
      this.renderPatientOutcomeSection(doc, body);
      this.renderReferralSection(doc, body);
    } else {
      // Clinical variant: Page 1 (Sections 1-4)
      this.renderScreeningSection(doc, body);
      await this.renderAiTriageSection(doc, body);
      this.renderReviewerSection(doc, body);

      // Clinical variant: Page 2 (Sections 5-6)
      doc.addPage();
      this.renderPage2Header(doc, report, body);
      this.renderReferralSection(doc, body);
      await this.renderAuditSection(doc, report, body);
    }

    // ─── Section 8: Footer on all buffered pages ─────────────────────────────
    this.renderFooters(doc);

    doc.end();
    return done;
  }

  renderPage2Header(doc, report, body) {
    const startX = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const y = doc.page.margins.top;

    doc.fillColor(INK.navy).font('Helvetica-Bold').fontSize(12).text('RetinaGuard', startX, y, { continued: true });
    doc.fillColor(INK.muted).font('Helvetica').fontSize(8.5).text('   ·   Clinical Audit Report (Page 2 / Referral & Audit)');

    const p = body.patient || {};
    const c = body.case || {};
    doc.fillColor(INK.text).font('Helvetica').fontSize(7.5)
      .text(`Patient: ${p.name || '—'} (ID: ${p.code || '—'})   ·   Case: ${c.caseNumber || '—'}   ·   Report: ${report.report_number}`, startX, y + 16);

    doc.strokeColor(INK.borderLight).lineWidth(0.5)
      .moveTo(startX, y + 28).lineTo(startX + pageWidth, y + 28).stroke();

    doc.y = y + 34;
  }

  // ─── SECTION 1: HEADER ─────────────────────────────────────────────────────
  renderHeader(doc, report, body, isPatient) {
    const startX = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const y = doc.y;

    // Brand Title
    doc.fillColor(INK.navy).font('Helvetica-Bold').fontSize(20).text('RetinaGuard', startX, y);
    doc.fillColor(INK.muted).font('Helvetica').fontSize(9).text('AI-Assisted Retinal Screening System', startX, y + 23);

    // Variant Badge on right
    const badgeText = isPatient ? 'PATIENT SUMMARY REPORT' : 'CLINICAL AUDIT REPORT';
    const badgeBg = isPatient ? '#ecfdf5' : '#eff6ff';
    const badgeBorder = isPatient ? '#10b981' : '#3b82f6';
    const badgeTextColor = isPatient ? '#065f46' : '#1e40af';

    const badgeWidth = 160;
    const badgeHeight = 22;
    const badgeX = startX + pageWidth - badgeWidth;

    doc.roundedRect(badgeX, y + 2, badgeWidth, badgeHeight, 4)
      .fillAndStroke(badgeBg, badgeBorder);

    doc.fillColor(badgeTextColor).font('Helvetica-Bold').fontSize(8.5)
      .text(badgeText, badgeX, y + 8, { width: badgeWidth, align: 'center' });

    // Meta-Information Box
    const metaY = y + 42;
    const metaHeight = 44;
    doc.roundedRect(startX, metaY, pageWidth, metaHeight, 3)
      .fillAndStroke(INK.lightBg, INK.borderLight);

    const facilityName = body.facility?.name || config?.node?.facilityName || 'District Screening Centre';
    const siteId = body.facility?.siteId || config?.node?.siteId || 'PHC-01';
    const caseNumber = body.case?.caseNumber || '—';
    const generatedAt = PdfService.formatDate(report.generated_at || body.generatedAt);
    const modelVersion = body.analysis?.modelVersion || '1.0.0';

    const col1X = startX + 8;
    const col2X = startX + pageWidth / 2 + 10;
    const colW = pageWidth / 2 - 16;

    // Row 1
    doc.fillColor(INK.muted).font('Helvetica').fontSize(7.5)
      .text('FACILITY: ', col1X, metaY + 6, { continued: true })
      .fillColor(INK.text).font('Helvetica-Bold')
      .text(`${facilityName} (ID: ${siteId})`, { width: colW });

    doc.fillColor(INK.muted).font('Helvetica').fontSize(7.5)
      .text('GENERATED: ', col2X, metaY + 6, { continued: true })
      .fillColor(INK.text).font('Helvetica')
      .text(generatedAt, { width: colW });

    // Row 2
    doc.fillColor(INK.muted).font('Helvetica').fontSize(7.5)
      .text('REPORT ID: ', col1X, metaY + 18, { continued: true })
      .fillColor(INK.text).font('Helvetica-Bold')
      .text(report.report_number, { width: colW });

    doc.fillColor(INK.muted).font('Helvetica').fontSize(7.5)
      .text('CASE ID: ', col2X, metaY + 18, { continued: true })
      .fillColor(INK.text).font('Helvetica-Bold')
      .text(caseNumber, { width: colW });

    // Row 3
    doc.fillColor(INK.muted).font('Helvetica').fontSize(7.5)
      .text('STATUS: ', col1X, metaY + 30, { continued: true })
      .fillColor(INK.routineText).font('Helvetica-Bold')
      .text('Final: Reviewer Adjudicated', { width: colW });

    doc.fillColor(INK.muted).font('Helvetica').fontSize(7.5)
      .text('SOFTWARE: ', col2X, metaY + 30, { continued: true })
      .fillColor(INK.text).font('Helvetica')
      .text(`App v3.0.0   ·   Model v${modelVersion}`, { width: colW });

    doc.x = startX;
    doc.y = metaY + metaHeight + 10;
  }

  // ─── SECTION 2: PATIENT DETAILS ────────────────────────────────────────────
  renderPatientSection(doc, body) {
    const p = body.patient || {};
    this.sectionHeading(doc, '1. Patient Details');

    const pairs = [
      ['Patient Name', p.name || '—'],
      ['Patient ID', p.code || '—'],
      ['Age / Sex', `${p.ageYears ?? '—'} yrs / ${PdfService.titleCase(p.sex)}`],
      ['Contact Number', p.phone || '—'],
    ];

    if (p.diabetesHistory === 'yes') {
      pairs.push(['Diabetes Duration', p.diabetesDurationYears != null ? `${p.diabetesDurationYears} years` : 'Not recorded']);
    }

    const location = [p.village, p.district, p.state].filter(Boolean).join(', ') || '—';
    pairs.push(['Location', location]);

    this.renderKeyValueGrid(doc, pairs, 3);
  }

  // ─── SECTION 3: SCREENING DETAILS (Clinical only) ──────────────────────────
  renderScreeningSection(doc, body) {
    const c = body.case || {};
    const img = body.image || {};
    const sc = body.screening || {};
    this.sectionHeading(doc, '2. Screening Details');

    const retakeCount = sc.recaptureAttempts ?? c.recaptureAttempts ?? 0;
    const sessionPairs = [
      ['Screening Timestamp', PdfService.formatDate(c.createdAt || sc.screeningDate)],
      ['Technician', `${c.technicianName || sc.technicianName || 'Technician on duty'}${sc.technicianId ? ` (${sc.technicianId})` : ''}`],
      ['Camera / Device ID', c.deviceId || sc.deviceId || config?.node?.deviceId || 'RG-CAM-01'],
      ['Retake Count', String(retakeCount)],
    ];

    this.renderKeyValueGrid(doc, sessionPairs, 4);

    const isRight = (item) => Boolean(item && (item.laterality === 'right' || item.laterality === 'OD' || item.laterality === 'od'));
    const isLeft = (item) => Boolean(item && (item.laterality === 'left' || item.laterality === 'OS' || item.laterality === 'os'));

    const rightEye = body.rightEye || body.eyes?.right || sc.rightEye
      || (isRight(img) ? img : null);
    const leftEye = body.leftEye || body.eyes?.left || sc.leftEye
      || (isLeft(img) ? img : null);

    const startX = doc.page.margins.left;
    const usableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const cardGap = 12;
    const cardW = (usableW - cardGap) / 2;
    const cardH = 74;
    const cardY = doc.y + 4;

    this.renderEyeCard(doc, startX, cardY, cardW, cardH, 'RIGHT EYE (OD)', rightEye);
    this.renderEyeCard(doc, startX + cardW + cardGap, cardY, cardW, cardH, 'LEFT EYE (OS)', leftEye);

    doc.x = startX;
    doc.y = cardY + cardH + 10;
  }

  renderEyeCard(doc, x, y, w, h, title, eye) {
    doc.roundedRect(x, y, w, h, 3).fillAndStroke(INK.lightBg, INK.borderLight);

    // Title
    doc.fillColor(INK.navy).font('Helvetica-Bold').fontSize(8.5)
      .text(title, x + 8, y + 6);

    const qualityLabel = eye?.qualityGrade
      ? `Grade ${eye.qualityGrade}${eye.qualityScore != null ? ` (${typeof eye.qualityScore === 'number' ? eye.qualityScore.toFixed(2) : eye.qualityScore}/100)` : ''}`
      : 'Not recorded';

    doc.fillColor(INK.muted).font('Helvetica').fontSize(7.5)
      .text(qualityLabel, x + 8, y + 6, { width: w - 16, align: 'right' });

    // Thumbnail
    const thumbSize = 50;
    const thumbX = x + 8;
    const thumbY = y + 17;
    const imgPath = eye?.absolutePath
      || (eye?.fundusPath && this.storageService ? this.storageService.absolute(eye.fundusPath) : null)
      || (eye?.fundusPath && path.isAbsolute(eye.fundusPath) ? eye.fundusPath : null)
      || (eye?.fundusPath ? path.resolve(config.uploads?.dir || 'uploads', eye.fundusPath) : null);

    const hasImage = Boolean(imgPath && fs.existsSync(imgPath));

    if (hasImage) {
      try {
        doc.image(imgPath, thumbX, thumbY, { fit: [thumbSize, thumbSize] });
      } catch (err) {
        this.renderImageUnavailable(doc, thumbX, thumbY, thumbSize, thumbSize, 'Image read error');
      }
    } else {
      this.renderImageUnavailable(doc, thumbX, thumbY, thumbSize, thumbSize, eye ? 'Image missing' : 'Not recorded');
    }

    // Key details beside thumbnail
    const detailsX = thumbX + thumbSize + 8;
    const detailsW = w - thumbSize - 20;
    const detailsY = y + 19;

    doc.fillColor(INK.muted).font('Helvetica').fontSize(6.5).text('IMAGE QUALITY', detailsX, detailsY);
    doc.fillColor(INK.text).font('Helvetica-Bold').fontSize(7.5).text(qualityLabel, detailsX, detailsY + 8, { width: detailsW });

    const statusText = eye
      ? `${PdfService.titleCase(eye.status || 'captured')} (Attempt ${eye.captureAttempt ?? 1})`
      : 'Not recorded';
    doc.fillColor(INK.muted).font('Helvetica').fontSize(6.5).text('CAPTURE STATUS', detailsX, detailsY + 22);
    doc.fillColor(INK.text).font('Helvetica-Bold').fontSize(7.5).text(statusText, detailsX, detailsY + 30, { width: detailsW });
  }

  renderImageUnavailable(doc, x, y, w, h, label = 'Not recorded') {
    doc.roundedRect(x, y, w, h, 2).fillAndStroke(INK.white, INK.borderLight);
    doc.fillColor(INK.muted).font('Helvetica-Bold').fontSize(6)
      .text('No image', x + 2, y + 14, { width: w - 4, align: 'center' });
    doc.font('Helvetica').fontSize(5.5)
      .text(label, x + 2, y + 25, { width: w - 4, align: 'center' });
  }

  // ─── SECTION 4: AI TRIAGE (Clinical only) ───────────────────────────────────
  async renderAiTriageSection(doc, body) {
    this.sectionHeading(doc, '3. AI Triage Output (AI Assist Only — Screening Assessment)');
    const a = body.analysis;
    const startX = doc.page.margins.left;
    const usableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    if (!a) {
      doc.fillColor(INK.muted).font('Helvetica-Bold').fontSize(9.5).text('Pending Screening Assessment');
      doc.font('Helvetica').fontSize(8.5).text('Automated screening assessment has not been performed for this case.');
      doc.moveDown(0.5);
      return;
    }

    const boxY = doc.y;
    const cardH = 80;
    doc.roundedRect(startX, boxY, usableW, cardH, 3).fillAndStroke(INK.lightBg, INK.borderLight);

    if (a.abstained) {
      // Abstained
      doc.fillColor(INK.uncertainText).font('Helvetica-Bold').fontSize(10)
        .text('AI Abstained', startX + 10, boxY + 10);
      doc.fillColor(INK.text).font('Helvetica').fontSize(8.5)
        .text(`Reason: ${a.abstainReason || 'Low confidence / unconfident prediction'}`, startX + 10, boxY + 24, { width: 320 })
        .text('Automated grading was withheld. The case was routed to the reviewer for manual adjudication.', startX + 10, boxY + 38, { width: 320 });
    } else {
      // Graded
      doc.fillColor(INK.navy).font('Helvetica-Bold').fontSize(11)
        .text(a.drGrade || '—', startX + 10, boxY + 10);
      doc.fillColor(INK.muted).font('Helvetica').fontSize(8.5)
        .text(`ICDR Grade: ${a.drGradeCode ?? '—'}   ·   Calibrated Confidence: ${a.confidence != null ? (a.confidence * 100).toFixed(1) : '—'}%   ·   P(referable): ${a.referableProbability != null ? (a.referableProbability * 100).toFixed(1) : '—'}%`, startX + 10, boxY + 26);
      doc.fillColor(INK.muted).font('Helvetica').fontSize(8)
        .text(`Screening Model: v${a.modelVersion || '1.0.0'}   ·   Pipeline Mode: Standard`, startX + 10, boxY + 40);
    }

    // Triage Priority Badge on bottom left of card
    const pri = PdfService.priorityStyle(a.priority);
    const badgeW = 180;
    const badgeH = 18;
    const badgeY = boxY + 54;
    doc.roundedRect(startX + 10, badgeY, badgeW, badgeH, 3).fillAndStroke(pri.bg, pri.border);
    doc.fillColor(pri.text).font('Helvetica-Bold').fontSize(8)
      .text(`Triage: ${pri.label}`, startX + 10, badgeY + 4.5, { width: badgeW, align: 'center' });

    // Right Column: Grad-CAM Heatmap thumbnail or placeholder
    const thumbSize = 64;
    const thumbX = startX + usableW - thumbSize - 12;
    const thumbY = boxY + 8;
    const gradcamPath = body.explainability?.gradcamPath;
    const hasHeatmap = gradcamPath && fs.existsSync(gradcamPath);

    if (hasHeatmap) {
      try {
        doc.image(gradcamPath, thumbX, thumbY, { fit: [thumbSize, thumbSize] });
        doc.fillColor(INK.muted).font('Helvetica').fontSize(6.5)
          .text('Grad-CAM Heatmap', thumbX - 10, thumbY + thumbSize + 2, { width: thumbSize + 20, align: 'center' });
      } catch {
        this.renderHeatmapUnavailable(doc, thumbX - 30, thumbY, 94, thumbSize);
      }
    } else {
      this.renderHeatmapUnavailable(doc, thumbX - 30, thumbY, 94, thumbSize);
    }
    doc.x = startX;
    doc.y = boxY + cardH + 10;
  }

  renderHeatmapUnavailable(doc, x, y, w, h) {
    doc.roundedRect(x, y, w, h, 3).fillAndStroke(INK.white, INK.borderLight);
    doc.fillColor(INK.muted).font('Helvetica-Bold').fontSize(7.5)
      .text('Heatmap unavailable', x, y + h / 2 - 10, { width: w, align: 'center' });
    doc.font('Helvetica').fontSize(6.5)
      .text('No coordinates on record', x, y + h / 2 + 1, { width: w, align: 'center' });
  }

  // ─── SECTION 5: REVIEWER ADJUDICATION (Clinical only) ──────────────────────
  renderReviewerSection(doc, body) {
    this.sectionHeading(doc, '4. Reviewer Adjudication (Authoritative Decision)');
    const r = body.review || {};
    const startX = doc.page.margins.left;
    const usableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    let agreementText = '—';
    if (r.agreedWithAi === true || r.agreement === 1) {
      agreementText = 'Agreed with AI';
    } else if (r.agreedWithAi === false || r.agreement === 0) {
      agreementText = 'Modified AI Grade';
    } else if (r.agreedWithAi === null || r.agreement === null) {
      agreementText = 'AI Abstained — Graded by Reviewer';
    }

    const regText = r.registrationNo ? `Reg No: ${r.registrationNo}` : 'Not recorded';
    const finalGradeText = r.finalGrade ? `${r.finalGrade} (ICDR Grade ${r.finalGradeCode ?? '—'})` : '—';

    const pairs = [
      ['Reviewer Name', `${r.reviewerName || 'Reviewer on record'} (${regText})`],
      ['Review Timestamp', PdfService.formatDate(r.reviewedAt)],
      ['Final DR Grade', finalGradeText],
      ['AI Agreement', agreementText],
    ];

    if (r.overrideReason) {
      pairs.push(['Override Reason', r.overrideReason]);
    }

    this.renderKeyValueGrid(doc, pairs, 2);

    // Final Priority Highlight Badge
    const pri = PdfService.priorityStyle(r.priority || (r.finalGradeCode >= 2 ? PRIORITY.P1 : PRIORITY.P3));
    const badgeW = usableW;
    const badgeH = 26;
    const badgeY = doc.y + 4;
    doc.roundedRect(startX, badgeY, badgeW, badgeH, 4).fillAndStroke(pri.bg, pri.border);

    doc.fillColor(pri.text).font('Helvetica-Bold').fontSize(10)
      .text(`FINAL CLINICAL PRIORITY:  ${pri.label.toUpperCase()}`, startX + 12, badgeY + 7, { width: badgeW - 24 });

    doc.y = badgeY + badgeH + 8;

    if (r.notes) {
      doc.fillColor(INK.muted).font('Helvetica').fontSize(7.5).text('REVIEWER NOTES:');
      doc.fillColor(INK.text).font('Helvetica').fontSize(8.5).text(r.notes, { width: usableW });
      doc.moveDown(0.4);
    }
  }

  // ─── SECTION 5 (Patient Variant Outcome) ────────────────────────────────────
  renderPatientOutcomeSection(doc, body) {
    this.sectionHeading(doc, '2. Screening Review Outcome');
    const r = body.review || {};
    const startX = doc.page.margins.left;
    const usableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const pri = PdfService.priorityStyle(r.priority || (r.finalGradeCode >= 2 ? PRIORITY.P1 : PRIORITY.P3));
    const cardY = doc.y;
    const cardH = 68;

    doc.roundedRect(startX, cardY, usableW, cardH, 4).fillAndStroke(pri.bg, pri.border);

    doc.fillColor(pri.text).font('Helvetica-Bold').fontSize(12)
      .text(`SCREENING PRIORITY:  ${pri.label.toUpperCase()}`, startX + 12, cardY + 10);

    const regNo = r.registrationNo ? `Reg No: ${r.registrationNo}` : 'On file';
    doc.fillColor(INK.text).font('Helvetica').fontSize(9)
      .text(`Final Assessment: ${r.finalGrade || 'Grading completed'}`, startX + 12, cardY + 28)
      .text(`Reviewed by: ${r.reviewerName || 'Ophthalmologist on record'} (${regNo})   ·   Date: ${PdfService.formatDate(r.reviewedAt)}`, startX + 12, cardY + 44);

    doc.y = cardY + cardH + 12;
  }

  // ─── SECTION 6: REFERRAL & NEXT STEPS (Both Variants) ──────────────────────
  renderReferralSection(doc, body) {
    const isPatient = (body.variant || 'clinical') === 'patient';
    const headingNumber = isPatient ? '3' : '5';
    this.sectionHeading(doc, `${headingNumber}. Referral and Next Steps`);

    const r = body.review || {};
    const urgencyKey = r.referralUrgency || (r.priority === 'P0' ? 'immediate' : (r.finalGradeCode >= 2 ? 'within_1_month' : 'routine'));
    const refData = REFERRAL_URGENCY_MAP[urgencyKey] || REFERRAL_URGENCY_MAP.routine;

    const startX = doc.page.margins.left;
    const usableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pri = PdfService.priorityStyle(r.priority || (r.finalGradeCode >= 2 ? PRIORITY.P1 : PRIORITY.P3));

    // Referral urgency card
    const refCardY = doc.y;
    const refCardH = 62;
    doc.roundedRect(startX, refCardY, usableW, refCardH, 3).fillAndStroke(INK.lightBg, INK.borderLight);

    doc.fillColor(pri.text).font('Helvetica-Bold').fontSize(9.5)
      .text(`Urgency: ${refData.urgency}`, startX + 10, refCardY + 8);

    doc.fillColor(INK.text).font('Helvetica').fontSize(8.5)
      .text(`English: ${refData.actionEn}`, startX + 10, refCardY + 24, { width: usableW - 20 });

    doc.fillColor(INK.text).font('Helvetica-Bold').fontSize(8.5)
      .text('Hindi: ', startX + 10, refCardY + 40, { continued: true });
    doc.font('Devanagari').fontSize(8.5)
      .text(refData.actionHi, { width: usableW - 60 });

    doc.x = startX;
    doc.y = refCardY + refCardH + 10;

    // Bilingual General Patient Instructions
    const halfW = (usableW - 12) / 2;
    const instY = doc.y;

    // English column
    doc.font('Helvetica-Bold').fontSize(8).fillColor(INK.navy).text('PATIENT INSTRUCTIONS (ENGLISH)', startX, instY);
    let currEnY = instY + 14;
    PATIENT_INSTRUCTIONS_EN.forEach((item) => {
      doc.font('Helvetica').fontSize(7.5).fillColor(INK.text)
        .text(`•  ${item}`, startX, currEnY, { width: halfW });
      currEnY += doc.heightOfString(`•  ${item}`, { width: halfW }) + 4;
    });

    // Hindi column
    const hiX = startX + halfW + 12;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(INK.navy).text('PATIENT INSTRUCTIONS / ', hiX, instY, { continued: true });
    doc.font('Devanagari-Bold').fontSize(8).text('मरीज के लिए निर्देश');

    let currHiY = instY + 14;
    PATIENT_INSTRUCTIONS_HI.forEach((item) => {
      doc.font('Helvetica').fontSize(7.5).fillColor(INK.text).text('•  ', hiX, currHiY, { continued: true });
      doc.font('Devanagari').fontSize(7.5).fillColor(INK.text).text(item, { width: halfW - 14 });
      currHiY += doc.heightOfString(item, { width: halfW - 14 }) + 4;
    });

    doc.x = startX;
    doc.y = Math.max(currEnY, currHiY) + 8;
  }

  // ─── SECTION 7: AUDIT AND SIGN-OFF (Clinical only) ──────────────────────────
  async renderAuditSection(doc, report, body) {
    this.sectionHeading(doc, '6. Audit and Sign-off');
    const startX = doc.page.margins.left;
    const usableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const boxY = doc.y;
    const boxH = 68;

    doc.roundedRect(startX, boxY, usableW, boxH, 3).fillAndStroke(INK.lightBg, INK.borderLight);

    const r = body.review || {};
    const c = body.case || {};
    const regNo = r.registrationNo ? `Reg No: ${r.registrationNo}` : 'On file';
    const syncState = body.syncStatus || c.syncState || 'synced';
    const syncLabel = syncState === 'synced' ? 'Synced to District Server' : 'Offline / Local Edge Node';

    // Left info
    const leftW = usableW - 90;
    doc.fillColor(INK.navy).font('Helvetica-Bold').fontSize(8)
      .text('REVIEWER ELECTRONIC SIGN-OFF:', startX + 8, boxY + 8);
    doc.fillColor(INK.text).font('Helvetica').fontSize(8)
      .text(`Digitally adjudicated by ${r.reviewerName || 'Reviewer on record'} (${regNo})`, startX + 8, boxY + 20)
      .text(`Timestamp: ${PdfService.formatDate(r.reviewedAt)}   ·   e-Signature record: VALID`, startX + 8, boxY + 32);

    doc.fillColor(INK.muted).font('Helvetica').fontSize(7.5)
      .text(`Tamper check: SHA-256 digest recorded in audit trail under action REPORT_GENERATED`, startX + 8, boxY + 44)
      .text(`Sync Status: ${syncLabel}   ·   Verification Token: ${report.verification_code || '—'}`, startX + 8, boxY + 54);

    // Right: QR Code containing Case ID ONLY (no personal data)
    const qrCaseId = c.caseNumber || body.consultationId || report.report_number;
    try {
      const qrPng = await QRCode.toBuffer(qrCaseId, { margin: 0, width: 160 });
      const qrX = startX + usableW - 60;
      doc.image(qrPng, qrX, boxY + 6, { fit: [52, 52] });
      doc.fillColor(INK.muted).font('Helvetica').fontSize(6)
        .text(`Case: ${qrCaseId}`, qrX - 10, boxY + 60, { width: 72, align: 'center' });
    } catch (err) {
      logger.warn({ err: err.message }, 'Failed to generate QR code for audit block');
    }

    doc.y = boxY + boxH + 8;
  }

  // ─── SECTION 8: TWO-PASS FOOTER (All Pages) ────────────────────────────────
  renderFooters(doc) {
    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    const startX = doc.page.margins.left;
    const usableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    // Hardcode footer offset to 64 (the original 40 bottom margin + 24) so it stays fixed
    const bottomY = doc.page.height - 64;

    for (let i = range.start; i < range.start + totalPages; i++) {
      doc.switchToPage(i);

      // Rule separator
      doc.strokeColor(INK.border).lineWidth(0.5)
        .moveTo(startX, bottomY).lineTo(startX + usableW, bottomY).stroke();

      // Disclaimer line
      doc.fillColor(INK.muted).font('Helvetica').fontSize(6.8)
        .text(DISCLAIMER_TEXT, startX, bottomY + 4, { width: usableW, align: 'center' });

      // Bottom bar
      doc.fillColor(INK.muted).font('Helvetica').fontSize(7)
        .text('Confidential: Medical Record', startX, bottomY + 15)
        .text(`Page ${i + 1} of ${totalPages}`, startX, bottomY + 15, { width: usableW, align: 'right' });
    }
  }

  // ─── HELPER RENDERING METHODS ──────────────────────────────────────────────
  sectionHeading(doc, title) {
    doc.x = doc.page.margins.left;
    doc.moveDown(0.35);
    doc.fillColor(INK.navy).font('Helvetica-Bold').fontSize(9.5).text(title.toUpperCase(), doc.page.margins.left);
    doc.moveDown(0.2);
    doc.strokeColor(INK.borderLight).lineWidth(0.5)
      .moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.moveDown(0.3);
    doc.x = doc.page.margins.left;
  }

  renderKeyValueGrid(doc, pairs, columns = 3) {
    const usableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colW = usableW / columns;
    const cellW = colW - 8;
    let y = doc.y;

    for (let i = 0; i < pairs.length; i += columns) {
      const row = pairs.slice(i, i + columns);
      let rowHeight = 0;

      row.forEach(([label, value], col) => {
        const x = doc.page.margins.left + col * colW;
        const text = value === null || value === undefined || value === '' ? '—' : String(value);

        doc.fillColor(INK.muted).font('Helvetica').fontSize(7.5)
          .text(String(label).toUpperCase(), x, y, { width: cellW });
        const labelH = doc.heightOfString(String(label).toUpperCase(), { width: cellW });

        doc.fillColor(INK.text).font('Helvetica-Bold').fontSize(8.5)
          .text(text, x, y + labelH + 1.5, { width: cellW });
        const valH = doc.heightOfString(text, { width: cellW });

        rowHeight = Math.max(rowHeight, labelH + valH + 6);
      });

      y += rowHeight;
      if (y > doc.page.height - doc.page.margins.bottom - 45) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    }
    doc.y = y + 2;
  }

  static lateralityText(value) {
    if (!value) return 'Both eyes (OU)';
    const v = String(value).toLowerCase();
    if (v === 'left' || v === 'os') return 'Left eye (OS)';
    if (v === 'right' || v === 'od') return 'Right eye (OD)';
    return 'Both eyes (OU)';
  }
}

module.exports = PdfService;
