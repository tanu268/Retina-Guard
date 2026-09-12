'use strict';
const fs = require('node:fs');
const path = require('path');
const { uuid, reportNumber, verificationToken } = require('../utils/ids');
const { NotFoundError } = require('../utils/errors');
const AuditService = require('./auditService');
const { gradeByCode } = require('../matlab/contracts');

const SCHEMA_VERSION = '1.0.0';

/**
 * Assembles the frozen report JSON (docs/interfaces.ts: ScreeningReport) and
 * renders the PDF from it. The JSON is the source of truth; the PDF is a view
 * of it, generated on demand and cached to disk.
 */
class ReportService {
  constructor({
    reportRepository, consultationRepository, analysisRepository, explainabilityRepository,
    imageRepository, reviewRepository, patientRepository, userRepository, pdfService, qrService,
    storageService, auditService, syncService, config,
  }) {
    this.repo = reportRepository;
    this.consultations = consultationRepository;
    this.analyses = analysisRepository;
    this.explain = explainabilityRepository;
    this.images = imageRepository;
    this.reviews = reviewRepository;
    this.patients = patientRepository;
    this.users = userRepository;
    this.pdf = pdfService;
    this.qr = qrService;
    this.storage = storageService;
    this.audit = auditService;
    this.sync = syncService;
    this.config = config;
  }

  /**
   * Assembles the report body.
   *
   * This previously produced a shape the PDF renderer did not read: the renderer
   * expects `patient.code` / `case.createdAt` / `analysis.*` / `image.absolutePath`,
   * and received `patient.patientCode` / `caseNumber` / `result.*` /
   * `images.fundusPath`. Combined with `render()` being handed the model instead
   * of a `{ payload }` wrapper, every field resolved to undefined and the PDF
   * rendered as a structurally valid but blank A4 document.
   *
   * The shape below is the renderer's contract. Both sides now agree.
   */
  async buildModel(consultationId) {
    const consultation = await this.consultations.findById(consultationId);
    if (!consultation) throw new NotFoundError('Consultation');

    const patient = await this.patients.findById(consultation.patient_id);
    const analyses = await this.analyses.listByConsultation(consultationId);
    const latest = analyses[0] || null;
    const image = latest ? await this.images.findById(latest.image_id) : null;
    const review = await this.reviews.findByConsultation(consultationId);
    const explain = latest ? await this.explain.listByAnalysis(latest.id) : [];

    const gradcamLayer = explain.find((l) => l.layer === 'gradcam');
    const lesionLayer = explain.find((l) => l.layer === 'lesion');
    const anatomyLayer = explain.find((l) => l.layer === 'anatomy');

    const grade = latest?.dr_grade_code != null ? gradeByCode(latest.dr_grade_code) : null;

    // Reviewer and technician names were previously hardcoded to null in the
    // report body, so the "Human reviewer decision" block rendered unattributed.
    const [reviewer, technician] = await Promise.all([
      review?.reviewer_id ? this.users.findById(review.reviewer_id).catch(() => null) : null,
      consultation.technician_id ? this.users.findById(consultation.technician_id).catch(() => null) : null,
    ]);

    const lesionCounts = lesionLayer?.payload?.counts || {};
    const lesions = Object.entries(lesionCounts)
      .filter(([, count]) => Number(count) > 0)
      .map(([type, count]) => ({ type, count: Number(count) }));

    // Diabetes history drives which clinical fields appear. When history is
    // 'no' or 'unknown', duration and HbA1c are omitted entirely rather than
    // rendered as an em dash — an empty HbA1c row on a clinical report reads as
    // "tested, result missing", which is not what was recorded.
    const diabetesHistory = patient?.diabetes_history
      || (patient?.diabetes_type ? (patient.diabetes_type === 'unknown' ? 'unknown' : 'yes') : 'unknown');
    const diabetesKnown = diabetesHistory === 'yes';

    return {
      schemaVersion: SCHEMA_VERSION,
      facility: { name: this.config?.node?.facilityName || null, siteId: consultation.site_id },

      patient: patient ? {
        name: patient.full_name,
        code: patient.patient_code,
        ageYears: patient.age,
        sex: patient.gender,
        phone: patient.phone,
        village: patient.village,
        district: patient.district,
        state: patient.state,
        diabetesHistory,
        diabetesType: diabetesKnown ? patient.diabetes_type : null,
        diabetesDurationYears: diabetesKnown ? patient.diabetes_duration_years : null,
        hba1c: diabetesKnown ? patient.hba1c : null,
      } : null,

      case: {
        caseNumber: consultation.case_number,
        createdAt: consultation.consultation_date || consultation.created_at,
        technicianName: technician?.full_name || null,
        status: consultation.status,
      },

      image: image ? {
        laterality: image.laterality,
        qualityGrade: image.quality_grade,
        absolutePath: image.file_path ? this.storage.absolute(image.file_path) : null,
      } : null,

      analysis: latest ? {
        abstained: Boolean(latest.abstained),
        abstainReason: latest.abstain_reason,
        drGrade: grade?.label ?? latest.dr_grade_label,
        drGradeCode: latest.dr_grade_code,
        confidence: latest.confidence,
        referableProbability: latest.referable_probability,
        referable: Boolean(latest.referable),
        priority: latest.triage_priority,
        modelVersion: latest.model_version,
        modelHash: latest.model_hash,
        warnings: latest.warnings || [],
      } : null,

      // Only a completed analysis persists explainability layers
      // (replaceForAnalysis runs in analysisService's completion path, never
      // its abstention path) — so an empty `explain` array means nothing to
      // show, not "nothing was found by evidence branches that ran". Building
      // a lesions/agreement object from zero layers would let the PDF assert
      // "no lesions detected" for a case where no detection was attempted at
      // all. explanationBlock's `if (!ex) return` handles the null case.
      explainability: explain.length > 0 ? {
        method: gradcamLayer?.payload?.method || 'Grad-CAM',
        gradcamPath: gradcamLayer?.artifact_path || null,
        lesionOverlayPath: lesionLayer?.artifact_path || null,
        agreementScore: gradcamLayer?.payload?.agreementScore ?? null,
        regionCount: gradcamLayer?.payload?.regions?.length ?? 0,
        peakIntensity: gradcamLayer?.payload?.peakIntensity ?? null,
        lesions,
        anatomy: {
          opticDisc: Boolean(anatomyLayer?.payload?.opticDisc?.detected),
          fovea: Boolean(anatomyLayer?.payload?.fovea?.detected),
          cupToDiscRatio: anatomyLayer?.payload?.opticDisc?.cupToDiscRatio ?? null,
          vessels: { coveragePercent: anatomyLayer?.payload?.vessels?.coveragePercent ?? null },
        },
        disagreementFlag: explain.some((l) => l.disagreement_flag),
      } : null,

      review: review ? {
        reviewerName: reviewer?.full_name || 'Reviewer on record',
        registrationNo: reviewer?.registration_no || null,
        decision: review.decision,
        finalGrade: gradeByCode(review.reviewer_grade_code)?.label ?? null,
        finalGradeCode: review.reviewer_grade_code,
        referralOutcome: review.referral_urgency,
        overrideReason: review.override_reason,
        notes: review.notes,
        reviewedAt: review.review_completed_at,
        agreedWithAi: review.agreement === null || review.agreement === undefined
          ? null : Boolean(review.agreement),
      } : null,

      status: review ? 'final' : 'provisional',
      generatedAt: new Date().toISOString(),
      verification: { url: null, token: null },
    };
  }

  async generate(consultationId, actor, req) {
    const consultation = await this.consultations.findById(consultationId);
    if (!consultation) throw new NotFoundError('Consultation');

    const model = await this.buildModel(consultationId);

    // A report without a completed review carries no screening outcome, so
    // generating one is allowed but never silently presented as final.
    const number = reportNumber(this.config.node.siteId);
    const token = verificationToken();
    const generatedAt = new Date().toISOString();

    model.verification = {
      token,
      url: `${this.config.sync?.districtUrl || ''}/reports/verify/${token}`,
    };

    const pdfRel = path.join('reports', `${number}.pdf`);
    const pdfAbs = this.storage.absolute(pdfRel);

    // The renderer reads `report.payload`, not the model directly.
    await this.pdf.render(
      {
        payload: model,
        report_number: number,
        schema_version: SCHEMA_VERSION,
        verification_code: token,
        generated_at: generatedAt,
      },
      pdfAbs,
    );

    const report = await this.repo.create({
      id: uuid(),
      consultation_id: consultationId,
      analysis_id: (await this.analyses.listByConsultation(consultationId))[0]?.id ?? null,
      review_id: (await this.reviews.findByConsultation(consultationId))?.id ?? null,
      report_number: number,
      schema_version: SCHEMA_VERSION,
      status: model.status,
      json_payload: model,
      pdf_path: pdfRel,
      qr_token: token,
      generated_by: actor?.id ?? null,
    });

    await this.repo.supersedeForConsultation(consultationId, report.id);
    await this.sync.enqueue({ entityType: 'report', entityId: report.id, operation: 'create', payload: report });
    await this.audit.record({
      action: AuditService.ACTIONS.REPORT_GENERATED, entityType: 'report', entityId: report.id,
      caseId: consultationId, actor, req, after: { reportNumber: report.report_number, status: report.status },
    });

    return report;
  }

  async getJson(consultationId) {
    const report = await this.repo.findByConsultation(consultationId);
    if (!report) throw new NotFoundError('Report');
    return report;
  }

  /**
   * Streams the rendered PDF. If the row exists but the file is missing from
   * disk — a storage volume that was not persisted, a report generated on
   * another node before sync — the report is re-rendered from the stored JSON
   * payload rather than returning a 404 for a case that genuinely has a report.
   */
  async getPdfStream(consultationId) {
    const report = await this.repo.findByConsultation(consultationId);
    if (!report) throw new NotFoundError('Report');

    let pdfPath = report.pdf_path;
    const exists = pdfPath && fs.existsSync(this.storage.absolute(pdfPath));

    if (!exists) {
      const payload = typeof report.json_payload === 'string'
        ? JSON.parse(report.json_payload) : report.json_payload;
      if (!payload) throw new NotFoundError('Report PDF');

      pdfPath = path.join('reports', `${report.report_number}.pdf`);
      await this.pdf.render(
        {
          payload,
          report_number: report.report_number,
          schema_version: report.schema_version,
          verification_code: report.qr_token,
          generated_at: report.generated_at,
        },
        this.storage.absolute(pdfPath),
      );
      await this.repo.update?.(report.id, { pdf_path: pdfPath }).catch(() => {});
    }

    return {
      stream: this.storage.stream(pdfPath),
      report,
      filename: `RetinaGuard_Report_${report.report_number}.pdf`,
    };
  }

  async verifyByQrToken(token) {
    const report = await this.repo.findByQrToken(token);
    if (!report) throw new NotFoundError('Report');
    return { valid: true, reportNumber: report.report_number, status: report.status, generatedAt: report.generated_at };
  }
}

module.exports = ReportService;
