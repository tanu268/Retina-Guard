'use strict';
const { ValidationError } = require('../utils/errors');

/**
 * Validates req[part] against a zod schema and replaces it with the parsed
 * (and therefore type-coerced/defaulted) value.
 */
function validate(schema, part = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return next(new ValidationError('Request validation failed', result.error.flatten()));
    }
    req[part] = result.data;
    next();
  };
}

module.exports = validate;
