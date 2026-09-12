'use strict';
const { CAPABILITIES } = require('../config/roles');
const { uuid } = require('../utils/ids');
const { ConflictError, ForbiddenError, NotFoundError, ValidationError } = require('../utils/errors');
const AuditService = require('./auditService');

/**
 * Administrator dashboard and user management.
 *
 * The overview surfaces real, dynamically-computed figures -- total patients,
 * per-role user counts, screenings completed, district-wise distribution,
 * storage usage, and recent activity -- rather than placeholder values, per
 * the admin redesign brief. Every number here is a live query against the
 * edge database, not a hardcoded stub.
 */
class AdminService {
  constructor({
    userRepository, consultationRepository, analysisRepository, patientRepository,
    auditRepository, storageService, matlabService, syncService, passwordService,
    auditService, config,
  }) {
    this.users = userRepository;
    this.consultations = consultationRepository;
    this.analyses = analysisRepository;
    this.patients = patientRepository;
    this.auditRepo = auditRepository;
    this.storage = storageService;
    this.matlab = matlabService;
    this.sync = syncService;
    this.password = passwordService;
    this.audit = auditService;
    this.config = config;
  }

  async dashboard() {
    const [
      statusCounts, gradeDistribution, storageCapacity, matlabHealth, syncStatus,
      totalPatients, totalTechnicians, totalReviewers, totalAdministrators,
      activeUsers, screeningsCompleted, districtStats, recentActivity,
    ] = await Promise.all([
      this.consultations.statusCounts(),
      this.analyses.gradeDistribution(),
      this.storage.capacity(),
      this.matlab.health(),
      this.sync.status(),
      this.patients.count(),
      this.users.count({ role: 'technician', is_active: 1 }),
      this.users.count({ role: 'reviewer', is_active: 1 }),
      this.users.count({ role: 'admin', is_active: 1 }),
      this.users.count({ is_active: 1 }),
      this.consultations.count({ status: 'closed' }),
      this.patients.countByDistrict(),
      this.auditRepo.recent(15),
    ]);

    return {
      site: { id: this.config.node.siteId, device: this.config.node.deviceId },

      overview: {
        totalPatients,
        totalTechnicians,
        totalReviewers,
        totalAdministrators,
        activeUsers,
        screeningsCompleted,
      },

      caseStatusCounts: statusCounts,
      gradeDistribution,
      districtStats,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entity_type,
        actorRole: a.actor_role,
        caseId: a.case_id,
        at: a.created_at,
      })),

      storage: storageCapacity,
      matlab: matlabHealth,
      sync: syncStatus,
    };
  }

  // -- User management ------------------------------------------------------

  /** Includes disabled accounts — the admin page needs them to re-enable. */
  async listUsers({ role, page = 1, limit = 50 } = {}) {
    const items = await this.users.listAll({ role, limit, offset: (page - 1) * limit });
    return items.map(this.#publicUser);
  }

  async createUser({ username, password, fullName, role, facilityId, registrationNo }, actor, req) {
    const existing = await this.users.findByUsername(username);
    if (existing) throw new ConflictError('Username already exists');

    const strength = this.password.validateStrength(password);
    if (!strength.valid) throw new ValidationError('Password does not meet policy', strength.issues);

    const user = await this.users.create({
      id: uuid(),
      username,
      password_hash: await this.password.hash(password),
      full_name: fullName,
      role,
      facility_id: facilityId || null,
      registration_no: registrationNo || null,
    });

    await this.audit.record({
      action: AuditService.ACTIONS.USER_CREATED, entityType: 'user', entityId: user.id, actor, req,
      after: this.#publicUser(user),
    });
    return this.#publicUser(user);
  }

  async updateUser(id, patch, actor, req) {
    const before = await this.users.findById(id);
    if (!before) throw new NotFoundError('User');

    const updates = {};
    if (patch.fullName !== undefined) updates.full_name = patch.fullName;
    if (patch.role !== undefined) updates.role = patch.role;
    if (patch.facilityId !== undefined) updates.facility_id = patch.facilityId;
    if (patch.registrationNo !== undefined) updates.registration_no = patch.registrationNo;

    const user = await this.users.update(id, updates);
    await this.audit.record({
      action: AuditService.ACTIONS.USER_UPDATED, entityType: 'user', entityId: id, actor, req,
      before: this.#publicUser(before), after: this.#publicUser(user),
    });
    return this.#publicUser(user);
  }

  /**
   * Disable -- the reversible, default action for removing someone's access.
   * Distinct from deleteUser (below), which is permanent.
   */
  async deactivateUser(id, actor, req) {
    this.#guardSelf(id, actor, 'deactivate your own account');
    const user = await this.users.update(id, { is_active: 0 });
    if (!user) throw new NotFoundError('User');
    await this.audit.record({
      action: AuditService.ACTIONS.USER_DEACTIVATED, entityType: 'user', entityId: id, actor, req,
    });
    return this.#publicUser(user);
  }

  async activateUser(id, actor, req) {
    const user = await this.users.update(id, { is_active: 1 });
    if (!user) throw new NotFoundError('User');
    await this.audit.record({
      action: AuditService.ACTIONS.USER_ACTIVATED, entityType: 'user', entityId: id, actor, req,
    });
    return this.#publicUser(user);
  }

  /**
   * Permanent removal. Soft-deletes the row (audit history and any record
   * that references this user by id survives) rather than hard-deleting,
   * since case records, reports, and audit entries hold this user's id as a
   * foreign key -- a hard delete would either cascade into clinical history
   * or fail on the constraint, neither of which is the right behaviour for a
   * "remove this account" action.
   */
  async deleteUser(id, actor, req) {
    this.#guardSelf(id, actor, 'delete your own account');
    const before = await this.users.findById(id);
    if (!before) throw new NotFoundError('User');

    await this.users.softDeleteById(id);
    await this.audit.record({
      action: AuditService.ACTIONS.USER_DELETED, entityType: 'user', entityId: id, actor, req,
      before: this.#publicUser(before),
    });
    return { id, deleted: true };
  }

  #guardSelf(targetId, actor, message) {
    if (actor?.id === targetId) {
      throw new ForbiddenError(`You cannot ${message}.`);
    }
  }

  #publicUser(user) {
    if (!user) return user;
    const { password_hash, failed_logins, locked_until, ...rest } = user;
    return rest;
  }

  capabilities() { return CAPABILITIES; }
}

module.exports = AdminService;
