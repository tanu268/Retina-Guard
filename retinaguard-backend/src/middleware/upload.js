'use strict';
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { config } = require('../config');
const { UnsupportedMediaTypeError } = require('../utils/errors');

const tmpDir = path.join(config.uploads.dir, 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname || '')}`),
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!config.uploads.allowedMime.includes(file.mimetype) || !config.uploads.allowedExt.includes(ext)) {
    return cb(new UnsupportedMediaTypeError(`Only ${config.uploads.allowedExt.join(', ')} images are accepted`));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.uploads.maxBytes, files: 1 },
});

module.exports = upload;
