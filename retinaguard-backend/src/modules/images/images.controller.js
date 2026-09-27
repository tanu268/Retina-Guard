'use strict';
const fs = require('fs');
const asyncHandler = require('../../utils/asyncHandler');
const { ValidationError, NotFoundError } = require('../../utils/errors');

function buildImagesController({ imageService }) {
  const upload = asyncHandler(async (req, res) => {
    if (!req.file) throw new ValidationError('An image file is required (field name: image)');
    const { consultationId, laterality } = req.body;

    try {
      const image = await imageService.upload({ consultationId, laterality, file: req.file }, req.user, req);
      const { image: assessed, quality, recaptureAllowed, remainingAttempts } = await imageService.assessQuality(image.id, req.user, req);
      res.status(201).json({ image: assessed, quality, recaptureAllowed, remainingAttempts });
    } finally {
      fs.existsSync(req.file.path) && fs.unlinkSync(req.file.path);
    }
  });

  const get = asyncHandler(async (req, res) => {
    const image = await imageService.get(req.params.id);
    res.status(200).json({ image });
  });

  const listByConsultation = asyncHandler(async (req, res) => {
    const images = await imageService.listByConsultation(req.params.consultationId);
    res.status(200).json({ images });
  });

  const remove = asyncHandler(async (req, res) => {
    const result = await imageService.remove(req.params.id, req.user, req);
    res.status(200).json(result);
  });

  const download = asyncHandler(async (req, res) => {
    const image = await imageService.get(req.params.id);
    if (!image) throw new NotFoundError('Image not found');

    const { config } = require('../../config');
    const path = require('path');
    const fs = require('fs');

    const absPath = path.resolve(config.uploads.dir, image.file_path);
    // Path traversal prevention: ensure the resolved path stays within uploadDir
    if (!absPath.startsWith(path.resolve(config.uploads.dir))) {
      throw new ValidationError('Invalid path');
    }

    if (!fs.existsSync(absPath)) {
      throw new NotFoundError('Image file missing from disk');
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    const stream = fs.createReadStream(absPath);
    stream.pipe(res);
  });

  return { upload, get, listByConsultation, remove, download };
}

module.exports = buildImagesController;
