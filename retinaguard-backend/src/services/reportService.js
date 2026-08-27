'use strict';
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
    imageRepository, reviewRepository, patientRepository, pdfService, qrService,
    storageService, auditService, syncService, config,
  }) {
    this.repo = reportRepository;
    this.consultations = consultationRepository;
    this.analyses = analysisRepository;
    this.explain = explainabilityRepository;
    this.images = imageRepository;
    this.reviews = reviewRepository;
    this.patients = patientRepository;
    this.pdf = pdfService;
    this.qr = qrService;
    this.storage = storageService;
    this.audit = auditService;
    this.sync = syncService;
    this.config = config;
  }

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

    return {
      reportNumber: null, // assigned on generate()
      caseNumber: consultation.case_number,
      status: review ? 'final' : 'provisional',
      siteId: consultation.site_id,
      generatedAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      patient: patient ? {
        name: patient.full_name, patientCode: patient.patient_code, age: patient.age,
        gender: patient.gender, village: patient.village, district: patient.district,
        diabetesDurationYears: patient.diabetes_duration_years,
      } : null,
      images: image ? {
        laterality: image.laterality,
        fundusPath: image.file_path,
        gradcamPath: gradcamLayer?.artifact_path ? path.relative(this.storage.root, gradcamLayer.artifact_path) : null,
      } : null,
      result: latest ? {
        abstained: Boolean(latest.abstained),
        abstainReason: latest.abstain_reason,
        abstainMessage: latest.abstain_reason,
        gradeCode: latest.dr_grade_code,
        gradeLabel: grade?.label ?? latest.dr_grade_label,
        confidence: latest.confidence,
        referableProbability: latest.referable_probability,
        referable: Boolean(latest.referable),
        triagePriority: latest.triage_priority,
        qualityGrade: image?.quality_grade,
        modelVersion: latest.model_version,
        modelHash: latest.model_hash,
        warnings: latest.warnings || [],
      } : null,
      explainability: {
        gradcam: gradcamLayer ? { regionCount: gradcamLayer.payload?.regions?.length ?? 0, peakIntensity: gradcamLayer.payload?.peakIntensity } : null,
        lesion: lesionLayer ? { counts: lesionLayer.payload?.counts || {} } : null,
        anatomy: anatomyLayer ? {
          opticDiscDetected: Boolean(anatomyLayer.payload?.opticDisc?.detected),
          foveaDetected: Boolean(anatomyLayer.payload?.fovea?.detected),
          cupToDiscRatio: anatomyLayer.payload?.opticDisc?.cupToDiscRatio,
        } : null,
        disagreement: explain.some((l) => l.disagreement_flag),
      },
      review: review ? {
        reviewerName: null, registrationNo: null,
        gradeCode: review.reviewer_grade_code,
        gradeLabel: gradeByCode(review.reviewer_grade_code)?.label,
        agreement: review.agreement,
        decision: review.decision,
        referralUrgency: review.referral_urgency,
        overrideReason: review.override_reason,
        notes: review.notes,
        completedAt: review.review_completed_at,
      } : null,
      qrToken: null,
    };
  }

  async generate(consultationId, actor, req) {
    const consultation = await this.consultations.findById(consultationId);
    if (!consultation) throw new NotFoundError('Consultation');

    const model = await this.buildModel(consultationId);
    model.reportNumber = reportNumber(this.config.node.siteId);
    model.qrToken = verificationToken();

    const pdfRel = path.join('reports', `${model.reportNumber}.pdf`);
    const pdfAbs = this.storage.absolute(pdfRel);
    await this.pdf.render(model, pdfAbs);

    const report = await this.repo.create({
      id: uuid(),
      consultation_id: consultationId,
      analysis_id: (await this.analyses.listByConsultation(consultationId))[0]?.id ?? null,
      review_id: (await this.reviews.findByConsultation(consultationId))?.id ?? null,
      report_number: model.reportNumber,
      schema_version: SCHEMA_VERSION,
      status: model.status,
      json_payload: model,
      pdf_path: pdfRel,
      qr_token: model.qrToken,
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

  async getPdfStream(consultationId) {
    const report = await this.repo.findByConsultation(consultationId);
    if (!report || !report.pdf_path) throw new NotFoundError('Report PDF');
    return { stream: this.storage.stream(report.pdf_path), report };
  }

  async verifyByQrToken(token) {
    const report = await this.repo.findByQrToken(token);
    if (!report) throw new NotFoundError('Report');
    return { valid: true, reportNumber: report.report_number, status: report.status, generatedAt: report.generated_at };
  }
}

module.exports = ReportService;
