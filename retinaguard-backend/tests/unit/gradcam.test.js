'use strict';
/**
 * retinaguard-backend/tests/unit/gradcam.test.js
 *
 * Regression + unit tests for the Grad-CAM fix.
 *
 * REGRESSION: onnxAdapter.generateGradCAM() previously returned a hardcoded
 * stub { heatmapPath: null, regions: [], targetLayer: 'layer4', peakIntensity: 0 }
 * regardless of input.  The regression test verifies that is no longer the case.
 */

const path = require('path');
const fs   = require('fs');
const os   = require('os');
const { EventEmitter } = require('events');

// ── Jest module mocks (must be at the top, before any imports) ──────────────

let mockSpawnImpl = () => { throw new Error('mockSpawnImpl not set'); };

jest.mock('child_process', () => ({
  spawn: (...args) => mockSpawnImpl(...args),
}));

// Prevent onnxruntime-node from doing real IO
jest.mock('onnxruntime-node', () => ({
  env: { logLevel: 'warning' },
  InferenceSession: { create: jest.fn().mockResolvedValue({}) },
  Tensor: jest.fn(),
}));

// Prevent real filesystem reads during constructor
jest.mock('fs', () => {
  const real = jest.requireActual('fs');
  return {
    ...real,
    existsSync: (p) => {
      // Only fake the model file path checks
      if (p && p.includes('retinaguard_resnet18.onnx') && p.includes('fake')) return true;
      return real.existsSync(p);
    },
    mkdirSync: jest.fn(), // suppress actual dir creation in tests
  };
});

const OnnxAdapter = require('../../src/inference/adapters/onnxAdapter');

// ── helpers ──────────────────────────────────────────────────────────────────

const baseConfig = {
  matlab: {
    modelVersion: '/fake/retinaguard_resnet18.onnx',
    modelHash: 'c49e78c9b6c7bfa5b0098bd40a3901d02c7b41c9598cac993891b29263476f3f',
  },
};

function makeAdapter() {
  const adapter = new OnnxAdapter({ config: baseConfig });
  adapter.healthState = 'READY';
  return adapter;
}

function makeSuccessSpawn(outputPath) {
  return (_cmd, _args) => {
    const proc = new EventEmitter();
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    process.nextTick(() => {
      proc.stdout.emit('data', JSON.stringify({
        cam_available: true,
        output_path: outputPath,
        target_layer: '/backbone/layer4/layer4.1/relu_1/Relu_output_0',
        fc_weight_name: 'backbone.fc.1.weight',
        class_idx: 0,
        feature_map_shape: [512, 12, 12],
        cam_shape: [12, 12],
        overlay_size: [384, 384],
        cam_min: 0.12,
        cam_max: 6.85,
        peak_yx_cam_space: [9, 7],
        peak_in_border: false,
        probabilities: [0.94, 0.03, 0.02, 0.001, 0.009],
      }));
      proc.emit('close', 0);
    });
    return proc;
  };
}

function makeFailSpawn(reason) {
  return () => {
    const proc = new EventEmitter();
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    process.nextTick(() => {
      proc.stdout.emit('data', JSON.stringify({ cam_available: false, reason }));
      proc.emit('close', 1);
    });
    return proc;
  };
}

function makeErrorSpawn(errMsg) {
  return () => {
    const proc = new EventEmitter();
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    process.nextTick(() => {
      proc.emit('error', new Error(errMsg));
    });
    return proc;
  };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('Grad-CAM — OnnxAdapter.generateGradCAM()', () => {

  const outputPath = '/tmp/test_cam_output.png';

  // ── REGRESSION: stub detection ────────────────────────────────────────────
  test('REGRESSION — generateGradCAM must not return a hardcoded null heatmapPath stub', async () => {
    mockSpawnImpl = makeSuccessSpawn(outputPath);
    const adapter = makeAdapter();
    const result = await adapter.generateGradCAM({
      imagePath: '/fake/image.png',
      sha256: 'abc',
      outputPath,
      drGradeCode: 0,
    });

    // REGRESSION: the old stub always returned heatmapPath: null
    expect(result.heatmapPath).not.toBeNull();
    expect(result.heatmapPath).toBe(outputPath);
    expect(result.gradcamAvailable).toBe(true);
    expect(result.targetLayer).toContain('layer4');
    // Old stub had peakIntensity: 0, new implementation returns actual value
    expect(result.peakIntensity).toBeGreaterThan(0);
  });

  // ── correct class index passed ────────────────────────────────────────────
  test('passes drGradeCode as --class argument to Python script', async () => {
    let capturedArgs = [];
    mockSpawnImpl = (_cmd, args) => {
      capturedArgs = args;
      return makeFailSpawn('TEST')();  // doesn't matter what it returns
    };
    const adapter = makeAdapter();
    await adapter.generateGradCAM({ imagePath: '/fake/img.png', outputPath, drGradeCode: 3 });

    const classArgIdx = capturedArgs.indexOf('--class');
    expect(classArgIdx).toBeGreaterThan(-1);
    expect(capturedArgs[classArgIdx + 1]).toBe('3');
  });

  // ── safe unavailable: adapter not READY ──────────────────────────────────
  test('returns gradcamAvailable=false when adapter healthState is not READY', async () => {
    const spawnSpy = jest.fn();
    mockSpawnImpl = spawnSpy;
    const adapter = makeAdapter();
    adapter.healthState = 'FAILED';

    const result = await adapter.generateGradCAM({ imagePath: '/fake/img.png', outputPath, drGradeCode: 0 });
    expect(result.heatmapPath).toBeNull();
    expect(result.gradcamAvailable).toBe(false);
    expect(result.gradcamUnavailableReason).toBe('ADAPTER_NOT_READY');
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  // ── safe unavailable: no output path ─────────────────────────────────────
  test('returns gradcamAvailable=false when outputPath is null', async () => {
    const spawnSpy = jest.fn();
    mockSpawnImpl = spawnSpy;
    const adapter = makeAdapter();

    const result = await adapter.generateGradCAM({ imagePath: '/fake/img.png', outputPath: null, drGradeCode: 0 });
    expect(result.heatmapPath).toBeNull();
    expect(result.gradcamAvailable).toBe(false);
    expect(result.gradcamUnavailableReason).toBe('NO_OUTPUT_PATH');
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  // ── safe unavailable: Python script exits with error ─────────────────────
  test('returns gradcamAvailable=false when Python exits non-zero', async () => {
    mockSpawnImpl = makeFailSpawn('ZERO_VARIANCE_CAM');
    const adapter = makeAdapter();

    const result = await adapter.generateGradCAM({ imagePath: '/fake/img.png', outputPath, drGradeCode: 2 });
    expect(result.heatmapPath).toBeNull();
    expect(result.gradcamAvailable).toBe(false);
    expect(result.gradcamUnavailableReason).toBe('ZERO_VARIANCE_CAM');
  });

  // ── safe unavailable: spawn itself throws ────────────────────────────────
  test('returns gradcamAvailable=false when python3 cannot be spawned', async () => {
    mockSpawnImpl = makeErrorSpawn('ENOENT: python3 not found');
    const adapter = makeAdapter();

    const result = await adapter.generateGradCAM({ imagePath: '/fake/img.png', outputPath, drGradeCode: 0 });
    expect(result.heatmapPath).toBeNull();
    expect(result.gradcamAvailable).toBe(false);
    expect(result.gradcamUnavailableReason).toBe('SPAWN_ERROR');
  });
});
