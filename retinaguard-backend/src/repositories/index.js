'use strict';
module.exports = {
  BaseRepository: require('./BaseRepository'),
  UserRepository: require('./userRepository'),
  RefreshTokenRepository: require('./refreshTokenRepository'),
  PatientRepository: require('./patientRepository'),
  ConsultationRepository: require('./consultationRepository'),
  ImageRepository: require('./imageRepository'),
  AnalysisRepository: require('./analysisRepository'),
  ExplainabilityRepository: require('./explainabilityRepository'),
  ReviewRepository: require('./reviewRepository'),
  ReportRepository: require('./reportRepository'),
  SyncQueueRepository: require('./syncQueueRepository'),
  AuditRepository: require('./auditRepository'),
  IdempotencyRepository: require('./idempotencyRepository'),
};
