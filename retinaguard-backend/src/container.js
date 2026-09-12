'use strict';
const { EventEmitter } = require('events');
const { config } = require('./config');
const { createDatabases } = require('./database');

const repos = require('./repositories');
const MatlabService = require('./matlab/matlabService');

const ClinicalSafetyService = require('./services/clinicalSafetyService');
const PasswordService = require('./services/passwordService');
const TokenService = require('./services/tokenService');
const AuditService = require('./services/auditService');
const StorageService = require('./services/storageService');
const SyncManager = require('./services/syncManager');
const SyncService = require('./services/syncService');
const QrService = require('./services/qrService');
const PdfService = require('./services/pdfService');
const AuthService = require('./services/authService');
const PatientService = require('./services/patientService');
const ConsultationService = require('./services/consultationService');
const ImageService = require('./services/imageService');
const AnalysisService = require('./services/analysisService');
const ReviewerService = require('./services/reviewerService');
const ReportService = require('./services/reportService');
const AdminService = require('./services/adminService');

/**
 * Composition root. One instance per process in production; a fresh instance
 * per test file in tests (see tests/helpers/buildTestContainer.js) so SQLite
 * ':memory:' databases never leak state between suites.
 */
async function buildContainer({ migrate = true } = {}) {
  const { edge, district } = await createDatabases({ migrate });
  const eventBus = new EventEmitter();

  // ── repositories (all edge-scoped; district sync goes through SyncManager) ─
  const userRepository = new repos.UserRepository({ db: edge });
  const refreshTokenRepository = new repos.RefreshTokenRepository({ db: edge });
  const patientRepository = new repos.PatientRepository({ db: edge });
  const consultationRepository = new repos.ConsultationRepository({ db: edge });
  const imageRepository = new repos.ImageRepository({ db: edge });
  const analysisRepository = new repos.AnalysisRepository({ db: edge });
  const explainabilityRepository = new repos.ExplainabilityRepository({ db: edge });
  const reviewRepository = new repos.ReviewRepository({ db: edge });
  const reportRepository = new repos.ReportRepository({ db: edge });
  const syncQueueRepository = new repos.SyncQueueRepository({ db: edge });
  const auditRepository = new repos.AuditRepository({ db: edge });
  const idempotencyRepository = new repos.IdempotencyRepository({ db: edge });

  // ── low-level services ──────────────────────────────────────────────────
  const clinicalSafetyService = new ClinicalSafetyService({ config });
  const passwordService = new PasswordService({ config });
  const tokenService = new TokenService({ config });
  const storageService = new StorageService({ config });
  const qrService = new QrService({ config });
  const matlabService = new MatlabService({ config });

  const syncManager = new SyncManager({ syncQueueRepository, districtDb: district, config, eventBus });
  const auditService = new AuditService({ auditRepository, syncService: { enqueue: (i) => syncManager.enqueue(i) }, config });
  const syncService = new SyncService({ syncManager, syncQueueRepository, auditService });
  const pdfService = new PdfService({ config, storageService, qrService });

  // ── domain services ──────────────────────────────────────────────────────
  const authService = new AuthService({ userRepository, refreshTokenRepository, passwordService, tokenService, auditService, config });
  const patientService = new PatientService({ patientRepository, auditService, syncService, config });
  const consultationService = new ConsultationService({ consultationRepository, patientRepository, auditService, syncService, eventBus, config });
  const imageService = new ImageService({
    imageRepository, consultationRepository, storageService, matlabService,
    clinicalSafetyService, auditService, syncService, config, eventBus,
  });
  const analysisService = new AnalysisService({
    analysisRepository, explainabilityRepository, imageRepository, consultationRepository,
    matlabService, clinicalSafetyService, storageService, auditService, syncService, config, eventBus,
  });
  const reviewerService = new ReviewerService({
    reviewRepository, consultationRepository, analysisRepository,
    clinicalSafetyService, auditService, syncService, eventBus,
  });
  const reportService = new ReportService({
    reportRepository, consultationRepository, analysisRepository, explainabilityRepository,
    imageRepository, reviewRepository, patientRepository, userRepository, pdfService, qrService,
    storageService, auditService, syncService, config,
  });
  const adminService = new AdminService({
    userRepository, consultationRepository, analysisRepository, patientRepository,
    auditRepository, storageService, matlabService, syncService, passwordService,
    auditService, config,
  });

  async function close() {
    syncManager.stop();
    edge.close();
    if (district) await district.close();
  }

  return {
    config, edge, district, eventBus,
    repos: {
      userRepository, refreshTokenRepository, patientRepository, consultationRepository,
      imageRepository, analysisRepository, explainabilityRepository, reviewRepository,
      reportRepository, syncQueueRepository, auditRepository, idempotencyRepository,
    },
    services: {
      clinicalSafetyService, passwordService, tokenService, storageService, qrService,
      matlabService, syncManager, auditService, syncService, pdfService,
      authService, patientService, consultationService, imageService, analysisService,
      reviewerService, reportService, adminService,
    },
    close,
  };
}

module.exports = { buildContainer };
