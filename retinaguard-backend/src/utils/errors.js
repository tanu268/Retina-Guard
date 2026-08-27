'use strict';

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Request validation failed', details) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}
class BadRequestError extends AppError {
  constructor(message = 'Bad request', details) { super(message, 400, 'BAD_REQUEST', details); }
}
class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details) { super(message, 401, 'UNAUTHORIZED', details); }
}
class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions', details) { super(message, 403, 'FORBIDDEN', details); }
}
class NotFoundError extends AppError {
  constructor(resource = 'Resource', details) { super(`${resource} not found`, 404, 'NOT_FOUND', details); }
}
class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details) { super(message, 409, 'CONFLICT', details); }
}
class PayloadTooLargeError extends AppError {
  constructor(message = 'Payload too large', details) { super(message, 413, 'PAYLOAD_TOO_LARGE', details); }
}
class UnsupportedMediaTypeError extends AppError {
  constructor(message = 'Unsupported media type', details) { super(message, 415, 'UNSUPPORTED_MEDIA_TYPE', details); }
}
class ClinicalSafetyError extends AppError {
  /** Raised when a request would bypass a mandatory clinical safety rule. */
  constructor(message, details) { super(message, 409, 'CLINICAL_SAFETY_VIOLATION', details); }
}
class MatlabError extends AppError {
  constructor(message = 'MATLAB pipeline failure', details) { super(message, 502, 'MATLAB_ERROR', details); }
}
class SyncError extends AppError {
  constructor(message = 'Synchronisation failure', details) { super(message, 503, 'SYNC_ERROR', details); }
}

module.exports = {
  AppError, ValidationError, BadRequestError, UnauthorizedError, ForbiddenError,
  NotFoundError, ConflictError, PayloadTooLargeError, UnsupportedMediaTypeError,
  ClinicalSafetyError, MatlabError, SyncError,
};
