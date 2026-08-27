'use strict';
const { execFile } = require('node:child_process');
const path = require('node:path');
const MatlabAdapter = require('../MatlabAdapter');
const config = require('../../config');
const logger = require('../../utils/logger');
const { hrStart, hrMs } = require('../../utils/time');
const { ServiceUnavailableError } = require('../../utils/errors');

/**
 * Real MATLAB adapter.
 *
 * Each pipeline stage is a MATLAB entry-point function in
 * src/matlab/scripts/*.m that prints a single JSON object on stdout between
 * the sentinels <<RG_JSON>> ... <</RG_JSON>>. Nothing else about the backend
 * changes when MATLAB_MODE flips from `mock` to `engine`.
 *
 * Invocation:  matlab -batch "rg_gradeDR('<imagePath>','<contextJsonPath>')"
 */
class EngineMatlabAdapter extends MatlabAdapter {
  constructor(options = {}) {
    super(options);
    this.mode = 'engine';
    this.bin = options.bin || config.matlab.bin;
    this.scriptsDir = options.scriptsDir || config.matlab.scriptsDir;
    this.timeoutMs = options.timeoutMs || config.matlab.timeoutMs;
  }

  static parseSentinel(stdout) {
    const match = /<<RG_JSON>>([\s\S]*?)<<\/RG_JSON>>/.exec(stdout);
    if (!match) throw new Error('MATLAB output did not contain an <<RG_JSON>> block');
    return JSON.parse(match[1].trim());
  }

  run(entryPoint, imagePath, context = {}) {
    const args = [
      '-batch',
      `addpath('${this.scriptsDir}'); ${entryPoint}('${imagePath}', '${Buffer.from(JSON.stringify(context)).toString('base64')}')`,
    ];
    return new Promise((resolve, reject) => {
      const t = hrStart();
      execFile(this.bin, args, { timeout: this.timeoutMs, maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          logger.error({ entryPoint, stderr: String(stderr).slice(0, 2000) }, 'MATLAB stage failed');
          return reject(new ServiceUnavailableError(
            `MATLAB stage ${entryPoint} failed`, { stage: entryPoint, reason: err.message }));
        }
        try {
          const parsed = EngineMatlabAdapter.parseSentinel(stdout);
          return resolve({ ...parsed, durationMs: parsed.durationMs ?? hrMs(t) });
        } catch (parseErr) {
          return reject(new ServiceUnavailableError(
            `MATLAB stage ${entryPoint} returned unparseable output`,
            { stage: entryPoint, reason: parseErr.message }));
        }
      });
    });
  }

  qualityAssessment(imagePath, ctx) { return this.run('rg_qualityAssessment', imagePath, ctx); }
  preprocessImage(imagePath, ctx) { return this.run('rg_preprocessImage', imagePath, ctx); }
  detectAnatomy(imagePath, ctx) { return this.run('rg_detectAnatomy', imagePath, ctx); }
  detectLesions(imagePath, ctx) { return this.run('rg_detectLesions', imagePath, ctx); }
  gradeDR(imagePath, ctx) { return this.run('rg_gradeDR', imagePath, ctx); }
  generateGradCAM(imagePath, ctx) { return this.run('rg_generateGradCAM', imagePath, ctx); }

  async healthCheck() {
    try {
      const out = await new Promise((resolve, reject) => {
        execFile(this.bin, ['-batch', 'disp(version)'], { timeout: 30000 }, (err, stdout) =>
          (err ? reject(err) : resolve(stdout)));
      });
      return { available: true, mode: 'engine', matlabVersion: String(out).trim(), scriptsDir: this.scriptsDir };
    } catch (err) {
      return { available: false, mode: 'engine', error: err.message, bin: this.bin, scriptsDir: path.resolve(this.scriptsDir) };
    }
  }
}

module.exports = EngineMatlabAdapter;
