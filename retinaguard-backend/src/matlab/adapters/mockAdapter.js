'use strict';
const path = require('path');
const fs = require('fs');
const { sha256 } = require('../../utils/hash');
const { stopwatch } = require('../../utils/time');
const {
  DR_GRADES, QUALITY_REASON_CODES, LESION_TYPES, gradeByCode,
} = require('../contracts');

/**
 * Deterministic mock of the MATLAB pipeline.
 *
 * Determinism matters twice over: the demo must be reproducible (Blueprint §20)
 * and tests must not flake. Every value is derived from the image SHA-256, so the
 * same file always produces the same grade, the same lesions and the same map.
 *
 * This adapter produces NO clinical evidence. Nothing it returns may be quoted
 * as a measured result — see the claim taxonomy in the blueprint.
 */
class MockMatlabAdapter {
  /**
   * `modelIntegrated = false` marks this adapter as having no real diagnostic
   * model behind it. matlabService checks this flag and abstains before
   * calling gradeDR/detectLesions/generateGradCAM at all, so no fabricated
   * clinical output is ever produced or persisted. Swap MATLAB_ADAPTER=cli
   * once a trained model is available — see cliAdapter.js, which implements
   * the same six-method contract against the real MATLAB pipeline and has no
   * such flag.
   */
  constructor({ config, fixturesDir = path.join(__dirname, '..', 'fixtures') }) {
    this.name = 'mock';
    this.modelIntegrated = false;
    this.config = config;
    this.fixturesDir = fixturesDir;
  }

  // Deterministic PRNG seeded from the image hash.
  #rng(seedHex, salt = '') {
    let h = parseInt(sha256(seedHex + salt).slice(0, 8), 16);
    return () => {
      h = (h * 1664525 + 1013904223) >>> 0;
      return h / 0xffffffff;
    };
  }

  async qualityAssessment({ imagePath, sha256: imageSha }) {
    const lap = stopwatch();
    const seed = imageSha || sha256(imagePath);
    const rand = this.#rng(seed, 'quality');

    // Fixture override: tests and the demo can force a Grade C path.
    const forced = this.#fixtureFor(seed, 'quality');
    if (forced) return { ...forced, durationMs: lap() };

    const score = 0.35 + rand() * 0.65;
    const qualityGrade = score >= 0.75 ? 'A' : score >= 0.55 ? 'B' : 'C';
    const reasonKeys = Object.keys(QUALITY_REASON_CODES);
    const reasons = qualityGrade === 'C'
      ? [reasonKeys[Math.floor(rand() * reasonKeys.length)]].map((code) => ({
        code, message: QUALITY_REASON_CODES[code],
      }))
      : [];

    return {
      qualityGrade,
      qualityScore: Number(score.toFixed(4)),
      gradeable: qualityGrade !== 'C',
      reasons,
      metrics: {
        focusScore: Number((0.4 + rand() * 0.6).toFixed(4)),
        illuminationUniformity: Number((0.4 + rand() * 0.6).toFixed(4)),
        contrast: Number((0.4 + rand() * 0.6).toFixed(4)),
        fieldCoverage: Number((0.6 + rand() * 0.4).toFixed(4)),
      },
      durationMs: lap(),
    };
  }

  async preprocessImage({ imagePath, sha256: imageSha }) {
    const lap = stopwatch();
    return {
      preprocessedPath: imagePath, // mock: no pixels are written
      preprocessingHash: this.config.matlab.preprocessingHash,
      operations: ['circular_crop', 'green_channel_emphasis', 'clahe', 'resize_512', 'normalise'],
      outputSize: [512, 512],
      sourceSha256: imageSha,
      durationMs: lap(),
    };
  }

  async detectAnatomy({ sha256: imageSha }) {
    const lap = stopwatch();
    const rand = this.#rng(imageSha, 'anatomy');
    const discX = 0.7 + rand() * 0.12;
    const discY = 0.45 + rand() * 0.1;
    return {
      opticDisc: {
        detected: true,
        centre: { x: Number(discX.toFixed(4)), y: Number(discY.toFixed(4)) },
        radius: Number((0.06 + rand() * 0.02).toFixed(4)),
        cupToDiscRatio: Number((0.3 + rand() * 0.25).toFixed(3)),
        confidence: Number((0.85 + rand() * 0.14).toFixed(3)),
      },
      fovea: {
        detected: true,
        centre: { x: Number((discX - 0.28).toFixed(4)), y: Number(discY.toFixed(4)) },
        confidence: Number((0.8 + rand() * 0.18).toFixed(3)),
      },
      vessels: {
        segmented: true,
        vesselDensity: Number((0.08 + rand() * 0.05).toFixed(4)),
        arteryVeinRatio: Number((0.6 + rand() * 0.15).toFixed(3)),
        tortuosityIndex: Number((1.05 + rand() * 0.25).toFixed(3)),
        maskPath: null,
      },
      macularZone: { withinTwoDiscDiameters: true },
      durationMs: lap(),
    };
  }

  async detectLesions() {
    // Previously fabricated lesion boxes and per-lesion confidence scores
    // from a seeded PRNG. Removed for the same reason as gradeDR — see there.
    throw new Error(
      'MockMatlabAdapter: lesion detection model is not integrated. '
      + 'Set MATLAB_ADAPTER=cli once a trained model is available.',
    );
  }

  async gradeDR() {
    // Previously fabricated a DR grade, confidence and class-probability
    // distribution from a seeded PRNG. Removed: no synthetic clinical output
    // may be produced. matlabService.runPipeline() checks modelIntegrated and
    // abstains before this is ever called; this throw is a backstop for any
    // direct caller.
    throw new Error(
      'MockMatlabAdapter: DR grading model is not integrated. '
      + 'Set MATLAB_ADAPTER=cli once a trained model is available.',
    );
  }

  async generateGradCAM() {
    // Previously fabricated attention regions and an "agreement score" against
    // lesion evidence — a confidence-shaped number with nothing real behind
    // it. Removed for the same reason as gradeDR — see there.
    throw new Error(
      'MockMatlabAdapter: Grad-CAM explainability model is not integrated. '
      + 'Set MATLAB_ADAPTER=cli once a trained model is available.',
    );
  }

  async health() {
    return { adapter: 'mock', available: true, matlabRuntime: false, note: 'Deterministic stub — not a clinical result.' };
  }

  /** Optional JSON fixtures keyed by image SHA-256, used for the scripted demo. */
  #fixtureFor(seed, kind) {
    if (!seed) return null;
    const file = path.join(this.fixturesDir, `${seed.slice(0, 16)}.${kind}.json`);
    if (!fs.existsSync(file)) return null;
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
  }
}

module.exports = MockMatlabAdapter;
