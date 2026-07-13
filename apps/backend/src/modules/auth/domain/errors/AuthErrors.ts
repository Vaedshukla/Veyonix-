import { ErrorCodes } from '@veyonix/shared-config';
import { AppError } from '@shared/errors/AppError';

export class InvalidCredentialsError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
      message: 'Invalid email or password.',
      statusCode: 401,
      isOperational: true,
    });
  }
}

export class TokenExpiredError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.AUTH_TOKEN_EXPIRED,
      message: 'Your session has expired. Please log in again.',
      statusCode: 401,
      isOperational: true,
    });
  }
}

export class TokenRevokedError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.AUTH_TOKEN_REVOKED,
      message: 'This token has been revoked.',
      statusCode: 401,
      isOperational: true,
    });
  }
}

export class RefreshTokenReuseError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.AUTH_REFRESH_TOKEN_REUSE,
      message: 'Token reuse detected. All sessions have been revoked for your security.',
      statusCode: 401,
      isOperational: true,
    });
  }
}

export class AccountDisabledError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.AUTH_ACCOUNT_DISABLED,
      message: 'Your account has been disabled. Please contact support.',
      statusCode: 403,
      isOperational: true,
    });
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.AUTH_EMAIL_NOT_VERIFIED,
      message: 'Please verify your email address before continuing.',
      statusCode: 403,
      isOperational: true,
    });
  }
}

export class PasswordTooWeakError extends AppError {
  constructor(details?: string[]) {
    super({
      code: ErrorCodes.AUTH_PASSWORD_TOO_WEAK,
      message: 'Password does not meet security requirements.',
      statusCode: 422,
      isOperational: true,
      details,
    });
  }
}

export class PasswordRecentlyUsedError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.AUTH_PASSWORD_RECENTLY_USED,
      message: 'This password was recently used. Please choose a different one.',
      statusCode: 422,
      isOperational: true,
    });
  }
}
