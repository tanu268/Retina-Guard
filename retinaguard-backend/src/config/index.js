'use strict';
require('dotenv').config();
const path = require('path');

const bool = (v, d = false) => (v === undefined ? d : String(v).toLowerCase() === 'true');
const num = (v, d) => (v === undefined || v === '' ? d : Number(v));
const list = (v, d = []) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : d);

const env = process.env.NODE_ENV || 'development';
const root = path.resolve(__dirname, '..', '..');

const config = {
  env,
  isTest: env === 'test',
  isProd: env === 'production',
  root,
  port: num(process.env.PORT, 4000),
  logLevel: process.env.LOG_LEVEL || (env === 'test' ? 'silent' : 'info'),

  node: {
    siteId: process.env.SITE_ID || 'PHC-UNREGISTERED',
    deviceId: process.env.DEVICE_ID || 'DEVICE-UNREGISTERED',
  },

  sqlite: {
    path: env === 'test'
      ? ':memory:'
      : path.resolve(root, process.env.SQLITE_PATH || './data/retinaguard.db'),
  },

  postgres: {
    enabled: bool(process.env.DISTRICT_SYNC_ENABLED, false),
    host: process.env.PG_HOST || 'localhost',
    port: num(process.env.PG_PORT, 5432),
    database: process.env.PG_DATABASE || 'retinaguard_district',
    user: process.env.PG_USER || 'retinaguard',
    password: process.env.PG_PASSWORD || '',
    ssl: bool(process.env.PG_SSL, false),
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-only-access-secret-do-not-ship',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-secret-do-not-ship',
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
    // Bounded offline capability — see Blueprint §08: offline auth must be bounded,
    // never an unlimited local identity system.
    offlineGraceHours: num(process.env.OFFLINE_GRACE_HOURS, 72),
    bcryptRounds: num(process.env.BCRYPT_ROUNDS, env === 'test' ? 4 : 12),
    issuer: 'retinaguard-edge',
  },

  uploads: {
    dir: path.resolve(root, process.env.UPLOAD_DIR || './uploads'),
    maxBytes: num(process.env.MAX_UPLOAD_BYTES, 25 * 1024 * 1024),
    allowedMime: list(process.env.ALLOWED_MIME, ['image/jpeg', 'image/jpg', 'image/png', 'image/x-png', 'image/tiff']),
    allowedExt: ['.jpg', '.jpeg', '.jfif', '.png', '.tif', '.tiff'],
  },

  clinical: {
    maxRecaptureAttempts: num(process.env.MAX_RECAPTURE_ATTEMPTS, 2),
    abstentionConfidenceThreshold: num(process.env.ABSTENTION_CONFIDENCE_THRESHOLD, 0.7),
    referableProbabilityThreshold: num(process.env.REFERABLE_PROBABILITY_THRESHOLD, 0.5),
    autoClearAuditSampleRate: num(process.env.AUTO_CLEAR_AUDIT_SAMPLE_RATE, 0.05),
    mandatoryHumanReview: bool(process.env.MANDATORY_HUMAN_REVIEW, true),
  },

  matlab: {
    adapter: process.env.MATLAB_ADAPTER || 'mock', // 'mock' | 'cli'
    bin: process.env.MATLAB_BIN || 'matlab',
    scriptDir: path.resolve(root, process.env.MATLAB_SCRIPT_DIR || './src/matlab/scripts'),
    timeoutMs: num(process.env.MATLAB_TIMEOUT_MS, 120000),
    modelVersion: process.env.MODEL_VERSION || 'retinaguard-resnet18-384-mvp',
    modelHash: process.env.MODEL_HASH || 'TO_BE_VERIFIED',
    preprocessingHash: process.env.PREPROCESSING_HASH || 'TO_BE_VERIFIED',
  },

  sync: {
    batchSize: num(process.env.SYNC_BATCH_SIZE, 25),
    maxAttempts: num(process.env.SYNC_MAX_ATTEMPTS, 8),
    baseBackoffMs: num(process.env.SYNC_BASE_BACKOFF_MS, 5000),
    intervalMs: num(process.env.SYNC_INTERVAL_MS, 60000),
  },

  http: {
    corsOrigins: list(process.env.CORS_ORIGINS, ['http://localhost:5173', 'http://localhost:3000']),
    rateLimitWindowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    rateLimitMax: num(process.env.RATE_LIMIT_MAX, 300),
    authRateLimitMax: num(process.env.AUTH_RATE_LIMIT_MAX, 10),
  },
};

function assertProductionSecrets() {
  if (!config.isProd) return;
  const weak = ['dev-only-access-secret-do-not-ship', 'dev-only-refresh-secret-do-not-ship'];
  if (weak.includes(config.auth.jwtSecret) || weak.includes(config.auth.jwtRefreshSecret)) {
    throw new Error('Refusing to start in production with default JWT secrets. Set JWT_SECRET and JWT_REFRESH_SECRET.');
  }
}

module.exports = { config, assertProductionSecrets };
