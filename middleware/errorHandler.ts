/**
 * Centralized Error Handler Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

const isProduction = process.env.NODE_ENV === 'production';

interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string;
}

function handleMulterError(err: Error & { code?: string }): ErrorResponse | null {
  if (err.code === 'LIMIT_FILE_SIZE')
    return { statusCode: 400, code: 'VALIDATION_ERROR', message: 'File too large' };
  if (err.code === 'LIMIT_UNEXPECTED_FILE')
    return { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Unexpected file field' };
  if (err.name === 'MulterError')
    return { statusCode: 400, code: 'VALIDATION_ERROR', message: err.message };
  return null;
}

function handlePrismaError(
  err: Error & { code?: string; meta?: { target?: string[] } },
): ErrorResponse | null {
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

function handleSyntaxError(err: Error & { status?: number }): ErrorResponse | null {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Invalid JSON in request body' };
  }
  return null;
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  logger.error({ err, method: req.method, url: req.url }, 'Request error');

  const multerError = handleMulterError(err as Error & { code?: string });
  if (multerError) {
    res
      .status(multerError.statusCode)
      .json({ success: false, error: { code: multerError.code, message: multerError.message } });
    return;
  }

  const prismaError = handlePrismaError(
    err as Error & { code?: string; meta?: { target?: string[] } },
  );
  if (prismaError) {
    res
      .status(prismaError.statusCode)
      .json({ success: false, error: { code: prismaError.code, message: prismaError.message } });
    return;
  }

  const syntaxError = handleSyntaxError(err as Error & { status?: number });
  if (syntaxError) {
    res.status(syntaxError.statusCode).json({
      success: false,
      error: { code: syntaxError.code, message: syntaxError.message },
    });
    return;
  }

  if (err instanceof AppError) {
    const response: {
      success: false;
      error: { code: string; message: string; details?: Record<string, string>; stack?: string };
    } = { success: false, error: { code: err.code, message: err.message } };
    if (err.details && Object.keys(err.details).length > 0) response.error.details = err.details;
    if (!isProduction && err.stack) response.error.stack = err.stack;
    res.status(err.statusCode).json(response);
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL',
      message: isProduction
        ? 'An unexpected error occurred'
        : err.message || 'Internal server error',
    },
  });
}
