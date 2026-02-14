/**
 * Zod Validation Middleware for Express
 */

import { z, type ZodSchema, type ZodError } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errors.js';

function formatZodErrors(error: ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    const fieldName = path || '_root';
    if (!details[fieldName]) {
      details[fieldName] = issue.message;
    }
  }
  return details;
}

function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = formatZodErrors(result.error);
      throw new ValidationError('Validation failed', details);
    }
    req.body = result.data;
    next();
  };
}

function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = formatZodErrors(result.error);
      throw new ValidationError('Invalid query parameters', details);
    }
    req.query = result.data;
    next();
  };
}

function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
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
