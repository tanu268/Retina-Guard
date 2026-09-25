'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { uuid, reportNumber, verificationToken } = require('../utils/ids');
const { NotFoundError, ClinicalSafetyError } = require('../utils/errors');
const AuditService = require('./auditService');
const { gradeByCode } = require('../matlab/contracts');

const SCHEMA_VERSION = '1.0.0';
const ALLOWED_REPORT_STATUSES = ['review_complete', 'closed'];

/**
 * Assembles the frozen report JSON and renders the PDF from it.
 * Only cases with completed clinical adjudication ('review_complete' or 'closed')
 * are permitted to generate or stream reports.
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
   * Validates that the consultation is in a final reviewed status.
   */
  assertAdjudicated(consultation) {
    if (!consultation) throw new NotFoundError('Consultation');
    if (!ALLOWED_REPORT_STATUSES.includes(consultation.status)) {
      throw new ClinicalSafetyError(
        `Report generation is restricted to reviewed cases. Current status is '${consultation.status}'.`
      );
    }
  }

  /**
   * Assembles the frozen report body.
   */
  async buildModel(consultationId, variant = 'clinical') {
    const consultation = await this.consultations.findById(consultationId);
    this.assertAdjudicated(consultation);

    const patient = await this.patients.findById(consultation.patient_id);
    const analyses = await this.analyses.listByConsultation(consultationId);
    const latest = analyses[0] || null;
    const image = latest ? await this.images.findById(latest.image_id) : null;
    const allImages = await this.images.listByConsultation(consultationId);
    const review = await this.reviews.findByConsultation(consultationId);
    const explain = latest ? await this.explain.listByAnalysis(latest.id) : [];

    const isRight = (img) => Boolean(img && (img.laterality === 'right' || img.laterality === 'OD' || img.laterality === 'od'));
    const isLeft = (img) => Boolean(img && (img.laterality === 'left' || img.laterality === 'OS' || img.laterality === 'os'));

    const activeImages = allImages.filter((img) => img.status !== 'superseded' && img.status !== 'deleted');
    const rightImg = activeImages.filter(isRight).pop()
      || allImages.filter(isRight).pop()
      || (isRight(image) ? image : null);
    const leftImg = activeImages.filter(isLeft).pop()
      || allImages.filter(isLeft).pop()
      || (isLeft(image) ? image : null);

    const formatEye = (img) => {
      if (!img) return null;
      return {
        id: img.id,
        laterality: img.laterality,
        lateralityLabel: isRight(img) ? 'Right eye (OD)' : 'Left eye (OS)',
        qualityGrade: img.quality_grade || null,
        qualityScore: img.quality_score ?? null,
        fundusPath: img.file_path || null,
        absolutePath: img.file_path ? this.storage.absolute(img.file_path) : null,
        captureAttempt: img.capture_attempt || 1,
        status: img.status || 'uploaded',
        deviceId: img.device_id || consultation.device_id || this.config?.node?.deviceId || 'RG-CAM-01',
      };
    };

    const rightEye = formatEye(rightImg);
    const leftEye = formatEye(leftImg);

    let eyesCaptured = 'Both eyes (OU)';
    if (rightEye && !leftEye) eyesCaptured = 'Right eye (OD)';
    else if (!rightEye && leftEye) eyesCaptured = 'Left eye (OS)';
    else if (!rightEye && !leftEye) eyesCaptured = image?.laterality ? (isRight(image) ? 'Right eye (OD)' : 'Left eye (OS)') : 'None';

    const gradcamLayer = explain.find((l) => l.layer === 'gradcam');
    const lesionLayer = explain.find((l) => l.layer === 'lesion');
    const anatomyLayer = explain.find((l) => l.layer === 'anatomy');

    const grade = latest?.dr_grade_code != null ? gradeByCode(latest.dr_grade_code) : null;

    const [reviewer, technician] = await Promise.all([
      review?.reviewer_id ? this.users.findById(review.reviewer_id).catch(() => null) : null,
      consultation.technician_id ? this.users.findById(consultation.technician_id).catch(() => null) : null,
    ]);

    const lesionCounts = lesionLayer?.payload?.counts || {};
    const lesions = Object.entries(lesionCounts)
      .filter(([, count]) => Number(count) > 0)
      .map(([type, count]) => ({ type, count: Number(count) }));

    const diabetesHistory = patient?.diabetes_history
      || (patient?.diabetes_type ? (patient.diabetes_type === 'unknown' ? 'unknown' : 'yes') : 'unknown');
    const diabetesKnown = diabetesHistory === 'yes';

    // Agreement normalization: 1 = agreed, 0 = modified, null = abstained
    let agreedWithAi = null;
    if (review) {
      if (review.agreement === 1 || review.agreement === true) agreedWithAi = true;
      else if (review.agreement === 0 || review.agreement === false) agreedWithAi = false;
    }

    return {
      schemaVersion: SCHEMA_VERSION,
      variant,
      reportNumber: null,
      caseNumber: consultation.case_number,
      status: 'final',
      siteId: consultation.site_id || this.config?.node?.siteId || 'PHC-01',
      facility: {
        name: this.config?.node?.facilityName || 'District Screening Centre',
        siteId: consultation.site_id || this.config?.node?.siteId || 'PHC-01',
      },

      patient: patient ? {
        name: patient.full_name,
        code: patient.patient_code,
        patientCode: patient.patient_code,
        ageYears: patient.age,
        age: patient.age,
        sex: patient.gender,
        gender: patient.gender,
        phone: patient.phone,
        village: patient.village,
        district: patient.district,
        state: patient.state,
        diabetesHistory,
        diabetesDurationYears: diabetesKnown ? patient.diabetes_duration_years : null,
        // Note: aadhaar is strictly omitted for privacy & DPDP compliance
      } : null,

      case: {
        caseNumber: consultation.case_number,
        createdAt: consultation.consultation_date || consultation.created_at,
        technicianName: technician?.full_name || null,
        technicianId: consultation.technician_id,
        deviceId: consultation.device_id || this.config?.node?.deviceId || 'RG-CAM-01',
        recaptureAttempts: consultation.recapture_attempts || 0,
        syncState: consultation.sync_state || 'synced',
        status: consultation.status,
      },

      screening: {
        screeningDate: consultation.consultation_date || consultation.created_at,
        technicianName: technician?.full_name || null,
        technicianId: consultation.technician_id,
        deviceId: consultation.device_id || this.config?.node?.deviceId || 'RG-CAM-01',
        eyesCaptured,
        qualityGrade: rightEye?.qualityGrade || leftEye?.qualityGrade || image?.quality_grade || 'A',
        qualityScore: rightEye?.qualityScore ?? leftEye?.qualityScore ?? image?.quality_score ?? null,
        recaptureAttempts: consultation.recapture_attempts || 0,
        rightEye,
        leftEye,
      },

      image: image ? {
        laterality: image.laterality,
        qualityGrade: image.quality_grade,
        qualityScore: image.quality_score ?? null,
        fundusPath: image.file_path,
        gradcamPath: gradcamLayer?.artifact_path || null,
        absolutePath: image.file_path ? this.storage.absolute(image.file_path) : null,
      } : (rightEye || leftEye ? {
        laterality: (rightEye || leftEye).laterality,
        qualityGrade: (rightEye || leftEye).qualityGrade,
        qualityScore: (rightEye || leftEye).qualityScore,
        fundusPath: (rightEye || leftEye).fundusPath,
        gradcamPath: gradcamLayer?.artifact_path || null,
        absolutePath: (rightEye || leftEye).absolutePath,
      } : null),

      images: image ? {
        laterality: image.laterality,
        fundusPath: image.file_path,
        gradcamPath: gradcamLayer?.artifact_path || null,
      } : (rightEye || leftEye ? {
        laterality: (rightEye || leftEye).laterality,
        fundusPath: (rightEye || leftEye).fundusPath,
        gradcamPath: gradcamLayer?.artifact_path || null,
      } : null),

      rightEye,
      leftEye,
      eyes: {
        right: rightEye,
        left: leftEye,
      },

      analysis: latest ? {
        abstained: Boolean(latest.abstained),
        abstainReason: latest.abstain_reason,
        drGrade: grade?.label ?? latest.dr_grade_label,
        drGradeCode: latest.dr_grade_code,
        gradeCode: latest.dr_grade_code,
        gradeLabel: grade?.label ?? latest.dr_grade_label,
        confidence: latest.confidence,
        referableProbability: latest.referable_probability,
        referable: Boolean(latest.referable),
        priority: latest.triage_priority,
        triagePriority: latest.triage_priority,
        qualityGrade: image?.quality_grade || 'A',
        modelVersion: latest.model_version || '1.0.0',
        modelHash: latest.model_hash,
        warnings: [],
      } : null,

      result: latest ? {
        abstained: Boolean(latest.abstained),
        abstainReason: latest.abstain_reason,
        drGrade: grade?.label ?? latest.dr_grade_label,
        gradeCode: latest.dr_grade_code,
        gradeLabel: grade?.label ?? latest.dr_grade_label,
        confidence: latest.confidence,
        referableProbability: latest.referable_probability,
        referable: Boolean(latest.referable),
        triagePriority: latest.triage_priority,
        qualityGrade: image?.quality_grade || 'A',
        modelVersion: latest.model_version || '1.0.0',
        modelHash: latest.model_hash,
        warnings: [],
      } : null,

      explainability: explain.length > 0 ? {
        method: gradcamLayer?.payload?.method || 'Grad-CAM',
        gradcam: {
          regionCount: gradcamLayer?.payload?.regions?.length ?? 0,
          peakIntensity: gradcamLayer?.payload?.peakIntensity ?? null,
        },
        lesion: {
          counts: lesionCounts,
        },
        anatomy: {
          opticDisc: Boolean(anatomyLayer?.payload?.opticDisc?.detected),
          opticDiscDetected: Boolean(anatomyLayer?.payload?.opticDisc?.detected),
          fovea: Boolean(anatomyLayer?.payload?.fovea?.detected),
          foveaDetected: Boolean(anatomyLayer?.payload?.fovea?.detected),
          cupToDiscRatio: anatomyLayer?.payload?.opticDisc?.cupToDiscRatio ?? null,
        },
        disagreement: explain.some((l) => l.disagreement_flag),
        gradcamPath: gradcamLayer?.artifact_path ? this.storage.absolute(gradcamLayer.artifact_path) : null,
        lesionOverlayPath: lesionLayer?.artifact_path ? this.storage.absolute(lesionLayer.artifact_path) : null,
        agreementScore: gradcamLayer?.payload?.agreementScore ?? null,
        lesions,
      } : null,

      review: review ? {
        reviewerName: reviewer?.full_name || 'Reviewer on record',
        registrationNo: reviewer?.registration_no || null,
        decision: review.decision,
        finalGrade: gradeByCode(review.reviewer_grade_code)?.label ?? null,
        finalGradeCode: review.reviewer_grade_code,
        gradeCode: review.reviewer_grade_code,
        gradeLabel: gradeByCode(review.reviewer_grade_code)?.label ?? null,
        referralOutcome: review.referral_urgency,
        referralUrgency: review.referral_urgency,
        overrideReason: review.override_reason,
        notes: review.notes,
        reviewedAt: review.review_completed_at,
        completedAt: review.review_completed_at,
        agreement: review.agreement,
        agreedWithAi,
        priority: consultation.triage_priority || (review.reviewer_grade_code >= 2 ? 'P1' : 'P3'),
      } : null,

      status: 'final',
      generatedAt: new Date().toISOString(),
      syncStatus: consultation.sync_state || 'synced',
      consultationId,
    };
  }

  async generate(consultationId, actor, req, variant = 'clinical') {
    const consultation = await this.consultations.findById(consultationId);
    this.assertAdjudicated(consultation);

    const model = await this.buildModel(consultationId, variant);
    const number = reportNumber(this.config.node.siteId);
    const token = verificationToken();
    const generatedAt = new Date().toISOString();

    model.reportNumber = number;
    model.verification = {
      token,
      url: `${this.config.sync?.districtUrl || ''}/reports/verify/${token}`,
    };

    const pdfRel = path.join('reports', `${number}_${variant}.pdf`);
    const pdfAbs = this.storage.absolute(pdfRel);

    await this.pdf.render(
      {
        payload: model,
        report_number: number,
        schema_version: SCHEMA_VERSION,
        verification_code: token,
        generated_at: generatedAt,
        variant,
      },
      pdfAbs,
    );

    const pdfBuffer = fs.readFileSync(pdfAbs);
    const pdfSha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    const report = await this.repo.create({
      id: uuid(),
      consultation_id: consultationId,
      analysis_id: (await this.analyses.listByConsultation(consultationId))[0]?.id ?? null,
      review_id: (await this.reviews.findByConsultation(consultationId))?.id ?? null,
      report_number: number,
      schema_version: SCHEMA_VERSION,
      status: 'final',
      json_payload: model,
      pdf_path: pdfRel,
      qr_token: token,
      generated_by: actor?.id ?? null,
    });

    await this.repo.supersedeForConsultation(consultationId, report.id);
    await this.sync.enqueue({ entityType: 'report', entityId: report.id, operation: 'create', payload: report });
    await this.audit.record({
      action: AuditService.ACTIONS.REPORT_GENERATED,
      entityType: 'report',
      entityId: report.id,
      caseId: consultationId,
      actor,
      req,
      after: {
        reportNumber: report.report_number,
        status: report.status,
        variant,
        pdfSha256,
      },
    });

    return { ...report, pdfSha256 };
  }

  async getJson(consultationId) {
    const consultation = await this.consultations.findById(consultationId);
    this.assertAdjudicated(consultation);

    let report = await this.repo.findByConsultation(consultationId);
    if (!report) {
      report = await this.generate(consultationId, null, null, 'clinical');
    }
    let payload = typeof report.json_payload === 'string'
      ? JSON.parse(report.json_payload)
      : { ...report.json_payload };

    payload.reportNumber = payload.reportNumber || report.report_number;
    payload.qrToken = payload.qrToken || report.qr_token;
    payload.caseNumber = payload.caseNumber || payload.case?.caseNumber || consultation.case_number;

    if (!payload.result && payload.analysis) {
      payload.result = {
        ...payload.analysis,
        gradeCode: payload.analysis.drGradeCode ?? payload.analysis.gradeCode,
        gradeLabel: payload.analysis.drGrade ?? payload.analysis.gradeLabel,
        triagePriority: payload.analysis.priority ?? payload.analysis.triagePriority,
      };
    }
    if (payload.review && payload.review.gradeCode === undefined) {
      payload.review.gradeCode = payload.review.finalGradeCode;
      payload.review.gradeLabel = payload.review.finalGrade;
      payload.review.referralOutcome = payload.review.referralUrgency;
      payload.review.completedAt = payload.review.reviewedAt;
    }
    if (payload.patient && !payload.patient.patientCode) {
      payload.patient.patientCode = payload.patient.code;
    }
    if (payload.patient && payload.patient.age === undefined) {
      payload.patient.age = payload.patient.ageYears;
    }
    if (payload.patient && !payload.patient.gender) {
      payload.patient.gender = payload.patient.sex;
    }

    return {
      ...report,
      json_payload: payload,
    };
  }

  /**
   * Streams the rendered PDF for the specified variant.
   * Gated on consultation status being review_complete or closed.
   */
  async getPdfStream(consultationId, variant = 'clinical') {
    const consultation = await this.consultations.findById(consultationId);
    this.assertAdjudicated(consultation);

    let report = await this.repo.findByConsultation(consultationId);
    if (!report) {
      report = await this.generate(consultationId, null, null, variant);
    }

    const variantRel = path.join('reports', `${report.report_number}_${variant}.pdf`);
    const variantAbs = this.storage.absolute(variantRel);

    if (!fs.existsSync(variantAbs)) {
      const payload = await this.buildModel(consultationId, variant);
      payload.reportNumber = report.report_number;
      payload.verification = {
        token: report.qr_token,
        url: `${this.config.sync?.districtUrl || ''}/reports/verify/${report.qr_token}`,
      };

      await this.pdf.render(
        {
          payload,
          report_number: report.report_number,
          schema_version: report.schema_version,
          verification_code: report.qr_token,
          generated_at: report.generated_at,
          variant,
        },
        variantAbs,
      );

      const pdfBuffer = fs.readFileSync(variantAbs);
      const pdfSha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

      await this.audit.record({
        action: AuditService.ACTIONS.REPORT_GENERATED,
        entityType: 'report',
        entityId: report.id,
        caseId: consultationId,
        after: {
          reportNumber: report.report_number,
          status: report.status,
          variant,
          pdfSha256,
        },
      });
    }

    const pdfBuffer = fs.readFileSync(variantAbs);
    const pdfSha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    return {
      stream: this.storage.stream(variantRel),
      report,
      filename: `RetinaGuard_Report_${report.report_number}_${variant}.pdf`,
      pdfSha256,
    };
  }

  async verifyByQrToken(token) {
    const report = await this.repo.findByQrToken(token);
    if (!report) throw new NotFoundError('Report');
    return { valid: true, reportNumber: report.report_number, status: report.status, generatedAt: report.generated_at };
  }
}

module.exports = ReportService;
