'use strict';
const MatlabService = require('../../src/matlab/matlabService');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ort = require('onnxruntime-node');

// ── helper to create a real dummy model file ──────────────────────────────────
const dummyModelPath = path.join(__dirname, 'dummy_model_safety.onnx');
let dummyHash;

beforeAll(() => {
  fs.writeFileSync(dummyModelPath, 'dummy-content-not-valid-onnx');
  dummyHash = crypto.createHash('sha256')
    .update('dummy-content-not-valid-onnx')
    .digest('hex')
    .toLowerCase();
});

afterAll(() => {
  if (fs.existsSync(dummyModelPath)) fs.unlinkSync(dummyModelPath);
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Pre-Recovery ML Safety Hardening', () => {

  // TEST 1: model artifact is missing from disk → abstain before preprocessing
  it('1 & 5. model missing → MODEL_NOT_INTEGRATED abstention, no preprocessing attempted', async () => {
    const config = {
      matlab: { adapter: 'onnx', modelVersion: 'non-existent.onnx', modelHash: 'TO_BE_VERIFIED' },
    };
    const svc = new MatlabService({ config });

    // model file does not exist → constructor already set modelIntegrated=false
    expect(svc.adapter.modelIntegrated).toBe(false);

    const out = await svc.runPipeline({
      imagePath: '/tmp/no-image.jpg', sha256: 'a'.repeat(64), qualityGrade: 'A',
    });

    expect(out.status).toBe('abstained');
    expect(out.abstainReason).toBe('MODEL_NOT_INTEGRATED');
    expect(out.gradeLabel).toBeNull();
    expect(out.grading).toBeNull();
    expect(out.lesionEvidence).toBeNull();
  });

  // TEST 2: model file exists but is not valid ONNX → init fails → abstain
  it('2. model initialization failure (bad ONNX) → MODEL_NOT_INTEGRATED abstention', async () => {
    const config = {
      matlab: { adapter: 'onnx', modelVersion: dummyModelPath, modelHash: dummyHash },
    };
    const svc = new MatlabService({ config });

    // File exists so constructor sets modelIntegrated=true initially
    expect(svc.adapter.modelIntegrated).toBe(true);

    const out = await svc.runPipeline({
      imagePath: '/tmp/no-image.jpg', sha256: 'a'.repeat(64), qualityGrade: 'A',
    });

    // ort.InferenceSession.create fails on non-ONNX content → MODEL_NOT_INTEGRATED
    expect(out.status).toBe('abstained');
    expect(out.abstainReason).toBe('MODEL_NOT_INTEGRATED');
    expect(out.gradeLabel).toBeNull();
    expect(out.grading).toBeNull();
  });

  // TEST 3: model file exists but hash does not match → abstain
  it('3. model hash mismatch → MODEL_NOT_INTEGRATED abstention', async () => {
    const wrongHash = 'b'.repeat(64);
    const config = {
      matlab: { adapter: 'onnx', modelVersion: dummyModelPath, modelHash: wrongHash },
    };
    const svc = new MatlabService({ config });

    const out = await svc.runPipeline({
      imagePath: '/tmp/no-image.jpg', sha256: 'a'.repeat(64), qualityGrade: 'A',
    });

    expect(out.status).toBe('abstained');
    expect(out.abstainReason).toBe('MODEL_NOT_INTEGRATED');
    expect(out.gradeLabel).toBeNull();
    // The error message from the adapter should mention hash mismatch
    expect(out.error).toMatch(/hash mismatch/i);
  });

  // TEST 4: model unavailable → no fabricated probabilities anywhere in the response
  it('4. model unavailable → zero fabricated clinical data in response', async () => {
    const config = {
      matlab: { adapter: 'onnx', modelVersion: 'definitely-missing.onnx' },
    };
    const svc = new MatlabService({ config });

    const out = await svc.runPipeline({
      imagePath: '/tmp/no-image.jpg', sha256: 'a'.repeat(64), qualityGrade: 'A',
    });

    expect(out.grading).toBeNull();
    expect(out.gradeLabel).toBeNull();
    expect(out.anatomy).toBeNull();
    expect(out.lesionEvidence).toBeNull();
    expect(out.gradcam).toBeNull();
  });

  // TEST 6: valid model path with ort mocked → pipeline completes normally
  it('6. valid model (mocked ort) → pipeline completes, gradeLabel defined', async () => {
    // Use a separate dummy file to avoid sharing the cached failed initializationPromise
    // from test 2 which used dummyModelPath with the same content.
    const freshModelPath = path.join(__dirname, 'dummy_model_fresh.onnx');
    fs.writeFileSync(freshModelPath, 'fresh-dummy-content');
    const freshHash = crypto.createHash('sha256')
      .update('fresh-dummy-content')
      .digest('hex')
      .toLowerCase();

    const mockSession = {
      run: jest.fn().mockResolvedValue({
        logits: { data: new Float32Array([3, 1, 0.5, 0.2, 0.1]) },
      }),
    };
    const createSpy = jest
      .spyOn(ort.InferenceSession, 'create')
      .mockResolvedValue(mockSession);

    const config = {
      matlab: { adapter: 'onnx', modelVersion: freshModelPath, modelHash: freshHash },
    };
    const svc = new MatlabService({ config });

    // Mock preprocessImage at the service adapter level
    jest.spyOn(svc.adapter, 'preprocessImage').mockResolvedValue({
      tensor: new Float32Array(3 * 384 * 384),
      metadata: {},
      preprocessedPath: '/tmp/no-image.jpg',
      durationMs: 0,
    });

    // Also mock gradeDR because its implementation calls preprocessImage internally again
    // (independent of the pipeline's preprocess stage). This is the unit test surface:
    // we verify the pipeline routing, not the ONNX inference internals.
    jest.spyOn(svc.adapter, 'gradeDR').mockResolvedValue({
      drGradeCode: 0,
      drGrade: 'No Apparent DR',
      confidence: 0.593,
      gradeProbabilities: [0.593, 0.081, 0.242, 0.040, 0.043],
      referableProbability: 0.325,
      referable: false,
      modelVersion: freshModelPath,
      durationMs: 10,
    });

    const out = await svc.runPipeline({
      imagePath: '/tmp/no-image.jpg', sha256: 'a'.repeat(64), qualityGrade: 'A',
    });

    expect(out.status).toBe('completed');
    expect(out.gradeLabel).toBeDefined();
    expect(out.grading).not.toBeNull();
    expect(out.grading.drGradeCode).toBe(0);

    createSpy.mockRestore();
    if (fs.existsSync(freshModelPath)) fs.unlinkSync(freshModelPath);
  });

  // TEST 7: mock adapter → abstains with MODEL_NOT_INTEGRATED, isolates from clinical path
  it('7. mock adapter → MODEL_NOT_INTEGRATED abstention, clinical stages never run', async () => {
    const config = { matlab: { adapter: 'mock' } };
    const svc = new MatlabService({ config });

    // Confirm mock adapter signals no model
    expect(svc.adapter.modelIntegrated).toBe(false);

    const out = await svc.runPipeline({
      imagePath: '/tmp/no-image.jpg', sha256: 'a'.repeat(64), qualityGrade: 'A',
    });

    expect(out.status).toBe('abstained');
    expect(out.abstainReason).toBe('MODEL_NOT_INTEGRATED');
    expect(out.grading).toBeNull();
    expect(out.lesionEvidence).toBeNull();
    expect(out.gradeLabel).toBeNull();
  });
});
