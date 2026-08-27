'use strict';
const path = require('node:path');
const fs = require('node:fs');
const MatlabAdapter = require('../MatlabAdapter');
const config = require('../../config');
const { sha256 } = require('../../utils/hash');
const { hrStart, hrMs } = require('../../utils/time');
const { DR_GRADE_BY_CODE, REFERABLE_MIN_GRADE, QUALITY_REASONS } = require('../../config/constants');
const { LESION_TYPES } = require('../contracts');

/**
 * Deterministic mock of the MATLAB pipeline.
 *
 * Determinism matters: the blueprint requires a demo path that produces the
 * same output for the same fixture every time (§20 "deterministic demo"). All
 * pseudo-randomness is derived from the image content hash, so a given fixture
 * always yields the same grade, lesions and CAM.
 *
 * Values returned here are MOCK. They are not measured model performance and
 * must never be quoted as results.
 */
class MockMatlabAdapter extends MatlabAdapter {
  constructor(options = {}) {
    super(options);
    this.mode = 'mock';
    this.artifactDir = options.artifactDir || config.uploads.dir;
  }

  /** Deterministic 0..1 stream seeded by image identity. */
  static rng(seedInput) {
    let h = parseInt(sha256(String(seedInput)).slice(0, 12), 16);
    return () => {
      h = (h * 1664525 + 1013904223) % 4294967296;
      return h / 4294967296;
    };
  }

  static seedOf(imagePath, context = {}) {
    return context.sha256 || `${path.basename(imagePath)}`;
  }

  async qualityAssessment(imagePath, context = {}) {
    const t = hrStart();
    const rnd = MockMatlabAdapter.rng(`quality:${MockMatlabAdapter.seedOf(imagePath, context)}`);
    const score = Number((0.35 + rnd() * 0.64).toFixed(3));
    const grade = score >= 0.75 ? 'A' : score >= 0.55 ? 'B' : 'C';

    const codes = Object.keys(QUALITY_REASONS);
    const reasons = [];
    if (grade !== 'A') {
      const primary = codes[Math.floor(rnd() * codes.length)];
      reasons.push({
        code: primary,
        message: QUALITY_REASONS[primary],
        severity: grade === 'C' ? 'BLOCK' : 'WARN',
      });
      if (grade === 'C' && rnd() > 0.6) {
        const secondary = codes[Math.floor(rnd() * codes.length)];
        if (secondary !== primary) {
          reasons.push({ code: secondary, message: QUALITY_REASONS[secondary], severity: 'WARN' });
        }
      }
    }

    return {
      grade,
      score,
      gradable: grade !== 'C',
      reasons,
      metrics: {
        focusScore: Number((score * 0.95 + rnd() * 0.05).toFixed(3)),
        illuminationUniformity: Number((0.4 + rnd() * 0.6).toFixed(3)),
        contrast: Number((0.3 + rnd() * 0.7).toFixed(3)),
        fieldCoveragePercent: Number((70 + rnd() * 30).toFixed(1)),
        artefactAreaPercent: Number((rnd() * 12).toFixed(2)),
      },
      durationMs: hrMs(t),
    };
  }

  async preprocessImage(imagePath, context = {}) {
    const t = hrStart();
    const outDir = path.join(this.artifactDir, 'overlays');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${context.imageId || path.parse(imagePath).name}_preprocessed.png`);
    // The mock does not transform pixels; it records what the real pipeline would do.
    return {
      preprocessedPath: outPath,
      preprocessingHash: config.matlab.preprocessingHash,
      outputSize: { width: 384, height: 384 },
      operations: [
        'circular_field_crop', 'illumination_normalisation',
        'clahe_green_channel', 'resize_384', 'imagenet_normalise',
      ],
      durationMs: hrMs(t),
    };
  }

  async detectAnatomy(imagePath, context = {}) {
    const t = hrStart();
    const rnd = MockMatlabAdapter.rng(`anatomy:${MockMatlabAdapter.seedOf(imagePath, context)}`);
    const overlayPath = path.join(this.artifactDir, 'overlays',
      `${context.imageId || path.parse(imagePath).name}_anatomy.png`);
    return {
      opticDisc: {
        x: Number((0.68 + rnd() * 0.12).toFixed(4)),
        y: Number((0.45 + rnd() * 0.1).toFixed(4)),
        radius: Number((0.06 + rnd() * 0.02).toFixed(4)),
        confidence: Number((0.85 + rnd() * 0.14).toFixed(3)),
      },
      fovea: {
        x: Number((0.32 + rnd() * 0.1).toFixed(4)),
        y: Number((0.5 + rnd() * 0.06).toFixed(4)),
        confidence: Number((0.78 + rnd() * 0.2).toFixed(3)),
      },
      vessels: {
        coveragePercent: Number((9 + rnd() * 6).toFixed(2)),
        tortuosityIndex: Number((1.05 + rnd() * 0.3).toFixed(3)),
        confidence: Number((0.8 + rnd() * 0.18).toFixed(3)),
      },
      overlayPath,
      durationMs: hrMs(t),
    };
  }

  async detectLesions(imagePath, context = {}) {
    const t = hrStart();
    const rnd = MockMatlabAdapter.rng(`lesion:${MockMatlabAdapter.seedOf(imagePath, context)}`);
    const severity = rnd();
    const lesions = LESION_TYPES.map((type, idx) => {
      const base = [8, 5, 4, 2, 1][idx];
      const count = Math.round(severity * base * (0.5 + rnd()));
      const boxes = Array.from({ length: Math.min(count, 6) }, () => ({
        x: Number(rnd().toFixed(4)),
        y: Number(rnd().toFixed(4)),
        w: Number((0.01 + rnd() * 0.04).toFixed(4)),
        h: Number((0.01 + rnd() * 0.04).toFixed(4)),
        score: Number((0.5 + rnd() * 0.49).toFixed(3)),
      }));
      return { type, count, confidence: Number((0.6 + rnd() * 0.38).toFixed(3)), boxes };
    }).filter((l) => l.count > 0);

    return {
      lesions,
      overlayPath: path.join(this.artifactDir, 'overlays',
        `${context.imageId || path.parse(imagePath).name}_lesions.png`),
      totalCount: lesions.reduce((s, l) => s + l.count, 0),
      durationMs: hrMs(t),
    };
  }

  async gradeDR(imagePath, context = {}) {
    const t = hrStart();
    const rnd = MockMatlabAdapter.rng(`grade:${MockMatlabAdapter.seedOf(imagePath, context)}`);
    // Ordinal-flavoured distribution: mass concentrated around a seeded peak.
    const peak = Math.floor(rnd() * 5);
    const raw = [0, 1, 2, 3, 4].map((c) => Math.exp(-Math.abs(c - peak) * (1.1 + rnd() * 0.9)));
    const sum = raw.reduce((a, b) => a + b, 0);
    const probs = raw.map((v) => Number((v / sum).toFixed(4)));
    const drGradeCode = probs.indexOf(Math.max(...probs));
    const referableProbability = Number(
      probs.slice(REFERABLE_MIN_GRADE).reduce((a, b) => a + b, 0).toFixed(4));

    return {
      drGradeCode,
      drGrade: DR_GRADE_BY_CODE[drGradeCode].label,
      gradeProbabilities: probs,
      confidence: Number(Math.max(...probs).toFixed(4)),
      referable: drGradeCode >= REFERABLE_MIN_GRADE,
      referableProbability,
      modelVersion: config.matlab.modelVersion,
      modelHash: config.matlab.modelHash,
      durationMs: hrMs(t),
    };
  }

  async generateGradCAM(imagePath, context = {}) {
    const t = hrStart();
    const rnd = MockMatlabAdapter.rng(`cam:${MockMatlabAdapter.seedOf(imagePath, context)}`);
    const dir = path.join(this.artifactDir, 'gradcam');
    fs.mkdirSync(dir, { recursive: true });
    const gradcam = path.join(dir, `${context.imageId || path.parse(imagePath).name}_gradcam.png`);
    const agreementScore = Number((0.35 + rnd() * 0.6).toFixed(3));
    return {
      gradcam,
      method: 'Grad-CAM',
      targetLayer: 'res5b_relu',
      agreementScore,
      // A CAM that does not overlap the detected lesion evidence is flagged for
      // the reviewer rather than silently suppressed (blueprint §06).
      disagreementFlag: agreementScore < 0.45,
      durationMs: hrMs(t),
    };
  }

  async healthCheck() {
    return { available: true, mode: 'mock', modelVersion: config.matlab.modelVersion };
  }
}

module.exports = MockMatlabAdapter;
