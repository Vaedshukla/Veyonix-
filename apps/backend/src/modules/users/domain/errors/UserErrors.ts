import { ErrorCodes } from '@veyonix/shared-config';
import { AppError } from '@shared/errors/AppError';

export class UserNotFoundError extends AppError {
  constructor(identifier: string) {
    super({
      code: ErrorCodes.USER_NOT_FOUND,
      message: `User '${identifier}' was not found.`,
      statusCode: 404,
      isOperational: true,
    });
  }
}

export class UserEmailTakenError extends AppError {
  constructor(email: string) {
    super({
      code: ErrorCodes.USER_EMAIL_TAKEN,
      message: `The email address '${email}' is already registered.`,
      statusCode: 409,
      isOperational: true,
    });
  }
}
