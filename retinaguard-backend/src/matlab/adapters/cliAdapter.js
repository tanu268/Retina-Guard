'use strict';
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { MatlabError } = require('../../utils/errors');
const { stopwatch } = require('../../utils/time');
const logger = require('../../utils/logger');

/**
 * Real MATLAB adapter — batch-mode invocation of the .m entry points.
 *
 * Contract with MATLAB: each entry point receives a JSON request file path and
 * writes a JSON response file. Nothing is parsed from stdout, because MATLAB
 * warnings and licence banners pollute stdout in the field.
 *
 *   matlab -batch "rg_entry('<requestFile>','<responseFile>')"
 *
 * Swapping MATLAB_ADAPTER=mock → cli changes no HTTP response shape. That is the
 * whole point of contracts.js.
 */
class MatlabCliAdapter {
  constructor({ config }) {
    this.name = 'cli';
    this.config = config;
    this.scriptDir = config.matlab.scriptDir;
    this.timeoutMs = config.matlab.timeoutMs;
  }

  async #invoke(entryFunction, payload) {
    const lap = stopwatch();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retinaguard-'));
    const reqFile = path.join(tmp, 'request.json');
    const resFile = path.join(tmp, 'response.json');
    fs.writeFileSync(reqFile, JSON.stringify(payload));

    const command = `addpath(genpath('${this.scriptDir}')); ${entryFunction}('${reqFile}','${resFile}');`;

    return new Promise((resolve, reject) => {
      execFile(
        this.config.matlab.bin,
        ['-batch', command],
        { timeout: this.timeoutMs, maxBuffer: 8 * 1024 * 1024 },
        (err, stdout, stderr) => {
          try {
            if (err) {
              logger.error({ entryFunction, stderr: String(stderr).slice(0, 2000) }, 'MATLAB invocation failed');
              return reject(new MatlabError(`MATLAB ${entryFunction} failed`, {
                reason: err.killed ? 'timeout' : 'non_zero_exit',
                stderr: String(stderr).slice(0, 1000),
              }));
            }
            if (!fs.existsSync(resFile)) {
              return reject(new MatlabError(`MATLAB ${entryFunction} produced no response file`, {
                stdout: String(stdout).slice(0, 1000),
              }));
            }
            const parsed = JSON.parse(fs.readFileSync(resFile, 'utf8'));
            if (parsed.error) {
              return reject(new MatlabError(`MATLAB ${entryFunction}: ${parsed.error}`, parsed));
            }
            return resolve({ ...parsed, durationMs: lap() });
          } catch (parseErr) {
            return reject(new MatlabError(`Unreadable MATLAB response from ${entryFunction}`, {
              cause: parseErr.message,
            }));
          } finally {
            fs.rmSync(tmp, { recursive: true, force: true });
          }
        },
      );
    });
  }

  qualityAssessment(req)  { return this.#invoke('rg_quality_assessment', req); }
  preprocessImage(req)    { return this.#invoke('rg_preprocess_image', req); }
  detectAnatomy(req)      { return this.#invoke('rg_detect_anatomy', req); }
  detectLesions(req)      { return this.#invoke('rg_detect_lesions', req); }
  gradeDR(req)            { return this.#invoke('rg_grade_dr', req); }
  generateGradCAM(req)    { return this.#invoke('rg_generate_gradcam', req); }

  async health() {
    try {
      const res = await this.#invoke('rg_health', {});
      return { adapter: 'cli', available: true, matlabRuntime: true, ...res };
    } catch (err) {
      return { adapter: 'cli', available: false, matlabRuntime: false, error: err.message };
    }
  }
}

module.exports = MatlabCliAdapter;
