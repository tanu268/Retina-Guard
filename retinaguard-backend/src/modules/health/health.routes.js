'use strict';
const { Router } = require('express');
const asyncHandler = require('../../utils/asyncHandler');

function buildHealthRouter({ edge, district, config, matlabService }) {
  const router = Router();

  /**
   * @openapi
   * /health:
   *   get:
   *     tags: [Health]
   *     summary: Liveness probe
   *     responses:
   *       200: { description: Service is up }
   */
  router.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'retinaguard-backend', time: new Date().toISOString() });
  });

  /**
   * @openapi
   * /health/ready:
   *   get:
   *     tags: [Health]
   *     summary: Readiness probe — edge DB reachable (district DB is optional / offline-first)
   *     responses:
   *       200: { description: Ready }
   *       503: { description: Not ready }
   */
  router.get('/ready', asyncHandler(async (req, res) => {
    const edgeOk = await edge.healthcheck().catch(() => false);
    const districtOk = district ? await district.healthcheck().catch(() => false) : null;
    const ready = edgeOk; // district being down must never fail readiness
    res.status(ready ? 200 : 503).json({
      ready, edge: edgeOk, district: districtOk,
      note: 'District connectivity is optional by design (offline-first edge node).',
    });
  }));

  /**
   * @openapi
   * /health/matlab:
   *   get:
   *     tags: [Health]
   *     summary: MATLAB adapter health (mock or real CLI)
   *     responses:
   *       200: { description: Adapter status }
   */
  router.get('/matlab', asyncHandler(async (req, res) => {
    res.status(200).json(await matlabService.health());
  }));

  return router;
}

module.exports = buildHealthRouter;