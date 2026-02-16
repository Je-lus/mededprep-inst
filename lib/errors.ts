/**
 * Standardized Error Classes for Express API
 */

class AppError extends Error {
  statusCode: number;
  code: string;
  details: Record<string, string> | null;
  isOperational: boolean;
  timestamp: string;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details: Record<string, string> | null = null,
    isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false as const,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details: Record<string, string> | null = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details: Record<string, string> | null = null) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Permission denied', details: Record<string, string> | null = null) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details: Record<string, string> | null = null) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details: Record<string, string> | null = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

class InternalError extends AppError {
  constructor(message = 'Internal server error', details: Record<string, string> | null = null) {
    super(message, 500, 'INTERNAL_ERROR', details, false);
  }
}

export {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalError,
};
