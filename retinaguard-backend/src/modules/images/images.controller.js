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

  return { upload, get, listByConsultation, remove };
}

module.exports = buildImagesController;
