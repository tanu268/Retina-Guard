'use strict';

/**
 * Abstract MATLAB adapter. Both MockMatlabAdapter and EngineMatlabAdapter
 * implement this surface; matlabService depends on the abstraction only
 * (Dependency Inversion — the "D" in SOLID).
 */
class MatlabAdapter {
  constructor(options = {}) { this.options = options; this.mode = 'abstract'; }

  // eslint-disable-next-line no-unused-vars, class-methods-use-this
  async qualityAssessment(imagePath, context) { throw new Error('qualityAssessment() not implemented'); }
  // eslint-disable-next-line no-unused-vars, class-methods-use-this
  async preprocessImage(imagePath, context) { throw new Error('preprocessImage() not implemented'); }
  // eslint-disable-next-line no-unused-vars, class-methods-use-this
  async detectAnatomy(imagePath, context) { throw new Error('detectAnatomy() not implemented'); }
  // eslint-disable-next-line no-unused-vars, class-methods-use-this
  async detectLesions(imagePath, context) { throw new Error('detectLesions() not implemented'); }
  // eslint-disable-next-line no-unused-vars, class-methods-use-this
  async gradeDR(imagePath, context) { throw new Error('gradeDR() not implemented'); }
  // eslint-disable-next-line no-unused-vars, class-methods-use-this
  async generateGradCAM(imagePath, context) { throw new Error('generateGradCAM() not implemented'); }

  // eslint-disable-next-line class-methods-use-this
  async healthCheck() { return { available: false, mode: 'abstract' }; }
}

module.exports = MatlabAdapter;
