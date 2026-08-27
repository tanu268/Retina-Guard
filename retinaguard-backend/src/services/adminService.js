'use strict';
const { CAPABILITIES } = require('../config/roles');

/**
 * Read-mostly operational endpoints for a facility administrator: user
 * management delegates to AuthService.createUser; this module covers system
 * health and reference data.
 */
class AdminService {
  constructor({
    userRepository, consultationRepository, analysisRepository, storageService,
    matlabService, syncService, config,
  }) {
    this.users = userRepository;
    this.consultations = consultationRepository;
    this.analyses = analysisRepository;
    this.storage = storageService;
    this.matlab = matlabService;
    this.sync = syncService;
    this.config = config;
  }

  async dashboard() {
    const [statusCounts, gradeDistribution, storageCapacity, matlabHealth, syncStatus] = await Promise.all([
      this.consultations.statusCounts(),
      this.analyses.gradeDistribution(),
      this.storage.capacity(),
      this.matlab.health(),
      this.sync.status(),
    ]);
    return {
      site: { id: this.config.node.siteId, device: this.config.node.deviceId },
      caseStatusCounts: statusCounts,
      gradeDistribution,
      storage: storageCapacity,
      matlab: matlabHealth,
      sync: syncStatus,
    };
  }

  async listUsers({ role, page = 1, limit = 50 } = {}) {
    const items = await this.users.listActive({ role, limit, offset: (page - 1) * limit });
    return items.map(({ password_hash, ...rest }) => rest);
  }

  async deactivateUser(id) {
    return this.users.update(id, { is_active: 0 });
  }

  capabilities() { return CAPABILITIES; }
}

module.exports = AdminService;
