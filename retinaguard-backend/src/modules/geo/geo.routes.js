'use strict';
const { Router } = require('express');
const { STATE_DISTRICTS, STATES, districtsOf } = require('../../config/indiaGeo');

/**
 * State/district lookup for the cascading registration dropdowns.
 *
 * Deliberately unauthenticated: this is reference data (state and district
 * names), not patient information, and the registration form needs it before
 * a technician's session is necessarily warm. Nothing here is PHI.
 */
function buildGeoRouter() {
  const router = Router();

  router.get('/states', (req, res) => {
    res.status(200).json({ states: STATES });
  });

  router.get('/districts', (req, res) => {
    const { state } = req.query;
    if (!state || !STATE_DISTRICTS[state]) {
      return res.status(400).json({ error: { code: 'UNKNOWN_STATE', message: 'Provide a valid "state" query parameter.' } });
    }
    return res.status(200).json({ state, districts: districtsOf(state) });
  });

  return router;
}

module.exports = buildGeoRouter;
