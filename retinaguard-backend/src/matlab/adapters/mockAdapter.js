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
  constructor({ config, fixturesDir = path.join(__dirname, '..', 'fixtures') }) {
    this.name = 'mock';
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

  async detectLesions({ sha256: imageSha, severityHint }) {
    const lap = stopwatch();
    const rand = this.#rng(imageSha, 'lesions');
    const severity = severityHint ?? Math.floor(rand() * 5);
    const budget = [0, 3, 9, 18, 26][severity] || 0;

    const lesions = [];
    for (let i = 0; i < budget; i += 1) {
      const type = severity >= 4 && i % 7 === 0
        ? 'neovascularisation'
        : LESION_TYPES[Math.floor(rand() * (severity >= 3 ? LESION_TYPES.length : 3))];
      lesions.push({
        type,
        bbox: {
          x: Number(rand().toFixed(4)),
          y: Number(rand().toFixed(4)),
          w: Number((0.01 + rand() * 0.04).toFixed(4)),
          h: Number((0.01 + rand() * 0.04).toFixed(4)),
        },
        areaPx: Math.round(20 + rand() * 400),
        confidence: Number((0.55 + rand() * 0.44).toFixed(3)),
        quadrant: ['superior_nasal', 'superior_temporal', 'inferior_nasal', 'inferior_temporal'][Math.floor(rand() * 4)],
      });
    }

    const counts = LESION_TYPES.reduce((acc, t) => {
      acc[t] = lesions.filter((l) => l.type === t).length;
      return acc;
    }, {});

    return {
      lesions,
      counts,
      totalLesions: lesions.length,
      quadrantsInvolved: [...new Set(lesions.map((l) => l.quadrant))].length,
      durationMs: lap(),
    };
  }

  async gradeDR({ sha256: imageSha, qualityGrade }) {
    const lap = stopwatch();
    const fixture = this.#fixtureFor(imageSha, 'grading');
    if (fixture) return { ...fixture, durationMs: lap() };

    const rand = this.#rng(imageSha, 'grading');
    // Skewed towards lower grades, roughly mirroring a screening population.
    const draw = rand();
    const code = draw < 0.45 ? 0 : draw < 0.65 ? 1 : draw < 0.85 ? 2 : draw < 0.95 ? 3 : 4;
    const grade = gradeByCode(code);

    // Grade B images get a deliberately flatter (less certain) distribution.
    const sharpness = qualityGrade === 'B' ? 2.2 : 4.0;
    const raw = DR_GRADES.map((g) => Math.exp(-Math.abs(g.code - code) * sharpness + rand() * 0.15));
    const sum = raw.reduce((a, b) => a + b, 0);
    const probs = raw.map((v) => Number((v / sum).toFixed(6)));

    const referableProbability = Number((probs[2] + probs[3] + probs[4]).toFixed(6));
    const confidence = Number(Math.max(...probs).toFixed(6));

    return {
      drGradeCode: code,
      drGrade: grade.label,
      gradeProbabilities: probs,
      confidence,
      referableProbability,
      referable: referableProbability >= this.config.clinical.referableProbabilityThreshold,
      modelVersion: this.config.matlab.modelVersion,
      modelHash: this.config.matlab.modelHash,
      calibration: { method: 'temperature_scaling', temperature: 1.0, status: 'TO_BE_VERIFIED' },
      durationMs: lap(),
    };
  }

  async generateGradCAM({ sha256: imageSha, outputPath, drGradeCode }) {
    const lap = stopwatch();
    const rand = this.#rng(imageSha, 'gradcam');
    const regions = [];
    const n = Math.min(4, Math.max(1, drGradeCode || 1));
    for (let i = 0; i < n; i += 1) {
      regions.push({
        x: Number(rand().toFixed(4)),
        y: Number(rand().toFixed(4)),
        w: Number((0.08 + rand() * 0.15).toFixed(4)),
        h: Number((0.08 + rand() * 0.15).toFixed(4)),
        intensity: Number((0.5 + rand() * 0.5).toFixed(3)),
      });
    }
    // Write a placeholder artefact so downstream file plumbing is exercised end-to-end.
    if (outputPath) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, MockMatlabAdapter.PLACEHOLDER_PNG);
    }
    return {
      heatmapPath: outputPath || null,
      targetLayer: 'features.7.conv',
      method: 'grad-cam',
      regions,
      peakIntensity: Math.max(...regions.map((r) => r.intensity)),
      durationMs: lap(),
    };
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

// 1×1 transparent PNG.
MockMatlabAdapter.PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

module.exports = MockMatlabAdapter;
