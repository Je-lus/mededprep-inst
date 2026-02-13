/**
 * Zod Validation Middleware for Express
 */

import { z } from 'zod';
import { ValidationError } from './errors.js';

function formatZodErrors(error) {
  const details = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    const fieldName = path || '_root';
    if (!details[fieldName]) {
      details[fieldName] = issue.message;
    }
  }
  return details;
}

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = formatZodErrors(result.error);
      throw new ValidationError('Validation failed', details);
    }
    req.body = result.data;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = formatZodErrors(result.error);
      throw new ValidationError('Invalid query parameters', details);
    }
    req.query = result.data;
    next();
  };
}

function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const details = formatZodErrors(result.error);
      throw new ValidationError('Invalid route parameters', details);
    }
    req.params = result.data;
    next();
  };
}

export { z, validate, validateQuery, validateParams };
