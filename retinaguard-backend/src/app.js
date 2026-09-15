'use strict';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const pinoHttp = require('pino-http');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const { config } = require('./config');
const logger = require('./utils/logger');
const swaggerDefinition = require('../swagger/definition');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { standardLimiter } = require('./middleware/rateLimiters');

const buildAuthRouter = require('./modules/auth/auth.routes');
const buildPatientsRouter = require('./modules/patients/patients.routes');
const buildGeoRouter = require('./modules/geo/geo.routes');
const buildConsultationsRouter = require('./modules/consultations/consultations.routes');
const buildImagesRouter = require('./modules/images/images.routes');
const buildAnalysisRouter = require('./modules/analysis/analysis.routes');
const buildReviewerRouter = require('./modules/reviewer/reviewer.routes');
const buildReportsRouter = require('./modules/reports/reports.routes');
const buildSyncRouter = require('./modules/sync/sync.routes');
const buildAuditRouter = require('./modules/audit/audit.routes');
const buildAdminRouter = require('./modules/admin/admin.routes');
const buildHealthRouter = require('./modules/health/health.routes');

/**
 * Builds the Express application. Pure function of `container` so the same
 * wiring is used by src/server.js in production and by tests/helpers/app.js
 * in the test suite (via supertest, no network socket required).
 */
function buildApp(container) {
  const { services, repos, edge, district, eventBus } = container;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: config.isProd ? undefined : false,
    crossOriginResourcePolicy: false,
  }));
  app.use(cors({ origin: config.http.corsOrigins, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(pinoHttp({
    logger,
    autoLogging: !config.isTest,
    redact: ['req.headers.authorization'],
    customLogLevel: (req, res, err) => (res.statusCode >= 500 || err ? 'error' : res.statusCode >= 400 ? 'warn' : 'debug'),
  }));
  app.use(standardLimiter);

  const deps = {
    ...services,
    ...repos,
    config, edge, district, eventBus,
  };

  // ── Swagger / OpenAPI ──────────────────────────────────────────────────
  const openapiSpec = swaggerJsdoc({
    definition: swaggerDefinition,
    apis: [path.join(__dirname, 'modules', '**', '*.routes.js')],
  });
  app.get('/openapi.json', (req, res) => res.json(openapiSpec));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
    customSiteTitle: 'RetinaGuard API Docs',
  }));

  // ── Routes ───────────────────────────────────────────────────────────────
  app.use('/health', buildHealthRouter(deps));
  app.use('/auth', buildAuthRouter(deps));
  app.use('/patients', buildPatientsRouter(deps));
  app.use('/geo', buildGeoRouter());
  app.use('/consultations', buildConsultationsRouter(deps));
  app.use('/images', buildImagesRouter(deps));
  app.use('/analysis', buildAnalysisRouter(deps));
  app.use('/review', buildReviewerRouter(deps));
  app.use('/reports', buildReportsRouter(deps));
  app.use('/sync', buildSyncRouter(deps));
  app.use('/audit', buildAuditRouter(deps));
  app.use('/admin', buildAdminRouter(deps));

  app.get('/', (req, res) => {
    res.json({
      service: 'RetinaGuard Backend', version: '1.0.0',
      docs: '/docs', openapi: '/openapi.json', health: '/health',
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = buildApp;
