'use strict';
const BaseRepository = require('./BaseRepository');
const { nowIso } = require('../utils/time');

class DeviceRepository extends BaseRepository {
  constructor(db) { super(db, { table: 'devices', versioned: false }); }
  findByCode(code) { return this.findOneBy({ device_code: code }); }
  async touch(id) { return this.update(id, { last_seen_at: nowIso() }); }
}
module.exports = DeviceRepository;
