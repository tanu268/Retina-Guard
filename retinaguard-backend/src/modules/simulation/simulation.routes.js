'use strict';

/**
 * simulation.routes.js
 *
 * Exposes read-only access to the RetinaGuard SimEvents capacity-planning
 * simulation results. These are OPERATIONAL metrics, not clinical predictions.
 *
 * The simulation runs offline in MATLAB/SimEvents (shift-level, 480 min).
 * Results are stored as JSON / CSV in simulation/simulink/experiments/ and
 * served by SimulationService – no live MATLAB dependency at request time.
 */

const { Router } = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const SimulationService = require('./simulation.service');

function buildSimulationRouter(deps) {
  const router = Router();
  const auth   = authenticate(deps);
  const svc    = new SimulationService();

  /**
   * @openapi
   * /simulation/info:
   *   get:
   *     tags: [Simulation]
   *     summary: SimEvents integration metadata – model paths, script locations, results availability
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Simulation asset information }
   */
  router.get(
    '/info',
    auth,
    authorize('admin', 'district', 'reviewer'),
    asyncHandler(async (req, res) => {
      res.json(svc.getInfo());
    })
  );

  /**
   * @openapi
   * /simulation/results:
   *   get:
   *     tags: [Simulation]
   *     summary: Latest SimEvents capacity-planning results (multi-scenario summaries)
   *     description: >
   *       Returns operational metrics from the RetinaGuard SimEvents Day 2 model.
   *       Metrics include throughput, reviewer utilisation, queue length, and waiting
   *       times per scenario. Does NOT return clinical screening predictions.
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Scenario summaries
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 summaries:
   *                   type: array
   *                   items:
   *                     type: object
   *                 source:
   *                   type: string
   *                   enum: [latest_results, demo_csv, none]
   *       503:
   *         description: No simulation results available
   */
  router.get(
    '/results',
    auth,
    authorize('admin', 'district', 'reviewer'),
    asyncHandler(async (req, res) => {
      const summaries = svc.getSummaries();
      if (!summaries || summaries.length === 0) {
        return res.status(503).json({
          error: 'NO_SIMULATION_RESULTS',
          message: 'No simulation results are available. Run run_retinaguard_sim.m in MATLAB to generate them.',
          instructions: 'See simulation/README.md for how to run the simulation.',
        });
      }
      const source = summaries[0]?.source || 'unknown';
      res.json({ summaries, source, count: summaries.length });
    })
  );

  /**
   * @openapi
   * /simulation/results/raw:
   *   get:
   *     tags: [Simulation]
   *     summary: Full raw simulation results including per-replication data
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Full results }
   *       503: { description: No results }
   */
  router.get(
    '/results/raw',
    auth,
    authorize('admin', 'district'),
    asyncHandler(async (req, res) => {
      const data = svc.getLatestResults();
      if (!data) {
        return res.status(503).json({
          error: 'NO_SIMULATION_RESULTS',
          message: 'No simulation results available.',
        });
      }
      res.json(data);
    })
  );

  return router;
}

module.exports = buildSimulationRouter;
