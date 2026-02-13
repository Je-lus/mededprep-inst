/**
 * Centralized Error Handler Middleware
 */

import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

const isProduction = process.env.NODE_ENV === 'production';

function handleMulterError(err) {
  if (err.code === 'LIMIT_FILE_SIZE')
    return { statusCode: 400, code: 'VALIDATION_ERROR', message: 'File too large' };
  if (err.code === 'LIMIT_UNEXPECTED_FILE')
    return { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Unexpected file field' };
  if (err.name === 'MulterError')
    return { statusCode: 400, code: 'VALIDATION_ERROR', message: err.message };
  return null;
}

function handlePrismaError(err) {
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return {
      statusCode: 409,
      code: 'CONFLICT',
      message: `A record with this ${field} already exists`,
    };
  }
  if (err.code === 'P2025')
    return { statusCode: 404, code: 'NOT_FOUND', message: 'Record not found' };
  if (err.code === 'P2003')
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Referenced record does not exist',
    };
  return null;
}

function handleSyntaxError(err) {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Invalid JSON in request body' };
  }
  return null;
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  logger.error({ err, method: req.method, url: req.url }, 'Request error');

  const multerError = handleMulterError(err);
  if (multerError)
    return res
      .status(multerError.statusCode)
      .json({ success: false, error: { code: multerError.code, message: multerError.message } });

  const prismaError = handlePrismaError(err);
  if (prismaError)
    return res
      .status(prismaError.statusCode)
      .json({ success: false, error: { code: prismaError.code, message: prismaError.message } });

  const syntaxError = handleSyntaxError(err);
  if (syntaxError)
    return res
      .status(syntaxError.statusCode)
      .json({ success: false, error: { code: syntaxError.code, message: syntaxError.message } });

  if (err instanceof AppError) {
    const response = { success: false, error: { code: err.code, message: err.message } };
    if (err.details && Object.keys(err.details).length > 0) response.error.details = err.details;
    if (!isProduction && err.stack) response.error.stack = err.stack;
    return res.status(err.statusCode).json(response);
  }

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL',
      message: isProduction
        ? 'An unexpected error occurred'
        : err.message || 'Internal server error',
    },
  });
}
