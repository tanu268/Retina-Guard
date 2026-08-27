'use strict';
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { sha256File } = require('../utils/hash');
const { NotFoundError } = require('../utils/errors');

/**
 * Filesystem-backed object storage for fundus images, overlays and PDFs.
 * Deliberately not S3: the edge node has to work with no network at all.
 */
class StorageService {
  constructor({ config }) {
    this.root = config.uploads.dir;
    for (const sub of ['fundus', 'gradcam', 'overlays', 'reports', 'tmp']) {
      fs.mkdirSync(path.join(this.root, sub), { recursive: true });
    }
  }

  /** Date-sharded path keeps directory listings usable after months of screening. */
  relativePath(bucket, filename, date = new Date()) {
    const ymd = date.toISOString().slice(0, 10);
    return path.join(bucket, ymd, filename);
  }

  absolute(relative) { return path.join(this.root, relative); }

  async place(tempPath, bucket, filename) {
    const rel = this.relativePath(bucket, filename);
    const abs = this.absolute(rel);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.rename(tempPath, abs).catch(async (err) => {
      if (err.code !== 'EXDEV') throw err;
      await fsp.copyFile(tempPath, abs);
      await fsp.unlink(tempPath);
    });
    const stat = await fsp.stat(abs);
    return { relativePath: rel, absolutePath: abs, sizeBytes: stat.size, sha256: await sha256File(abs) };
  }

  async read(relative) {
    const abs = this.absolute(relative);
    if (!fs.existsSync(abs)) throw new NotFoundError('File');
    return fsp.readFile(abs);
  }

  stream(relative) {
    const abs = this.absolute(relative);
    if (!fs.existsSync(abs)) throw new NotFoundError('File');
    return fs.createReadStream(abs);
  }

  exists(relative) { return fs.existsSync(this.absolute(relative)); }

  async remove(relative) {
    const abs = this.absolute(relative);
    if (!fs.existsSync(abs)) return false;
    await fsp.unlink(abs);
    return true;
  }

  /** Free-space probe — a full disk at a PHC must surface before capture, not during. */
  async capacity() {
    try {
      const stat = await fsp.statfs(this.root);
      const freeBytes = stat.bsize * stat.bavail;
      const totalBytes = stat.bsize * stat.blocks;
      return {
        freeBytes,
        totalBytes,
        freePercent: totalBytes ? Number(((freeBytes / totalBytes) * 100).toFixed(2)) : null,
        low: freeBytes < 500 * 1024 * 1024,
      };
    } catch {
      return { freeBytes: null, totalBytes: null, freePercent: null, low: false };
    }
  }
}

module.exports = StorageService;
