import { ErrorCodes } from '@veyonix/shared-config';

import { AppError } from './AppError';

/** Thrown for business rule violations in the domain layer */
export class DomainError extends AppError {
  constructor(message: string, code = ErrorCodes.UNPROCESSABLE_ENTITY) {
    super({ code, message, statusCode: 422, isOperational: true });
  }
}

/** Entity or resource not found */
export class NotFoundError extends AppError {
  constructor(message: string, code = ErrorCodes.NOT_FOUND) {
    super({ code, message, statusCode: 404, isOperational: true });
  }
}

/** Caller is not authenticated */
export class UnauthorizedError extends AppError {
  constructor(message: string, code = ErrorCodes.UNAUTHORIZED) {
    super({ code, message, statusCode: 401, isOperational: true });
  }
}

/** Caller is authenticated but lacks permission */
export class ForbiddenError extends AppError {
  constructor(message: string, code = ErrorCodes.FORBIDDEN) {
    super({ code, message, statusCode: 403, isOperational: true });
  }
}

/** Resource already exists */
export class ConflictError extends AppError {
  constructor(message: string, code = ErrorCodes.CONFLICT) {
    super({ code, message, statusCode: 409, isOperational: true });
  }
}

/** Input validation failed */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown[], code = ErrorCodes.VALIDATION_ERROR) {
    super({ code, message, statusCode: 422, isOperational: true, details });
  }
}

/** Feature is not enabled for this tenant */
export class FeatureDisabledError extends AppError {
  constructor(feature: string) {
    super({
      code: ErrorCodes.FEATURE_NOT_ENABLED,
      message: `Feature '${feature}' is not enabled for your organization.`,
      statusCode: 403,
      isOperational: true,
    });
  }
}

/** Service is temporarily unavailable */
export class ServiceUnavailableError extends AppError {
  constructor(message: string) {
    super({
      code: ErrorCodes.SERVICE_UNAVAILABLE,
      message,
      statusCode: 503,
      isOperational: true,
    });
  }
}
