import { ErrorCodes } from '@veyonix/shared-config';
import { AppError } from '@shared/errors/AppError';

export class AgentEnrollmentFailedError extends AppError {
  constructor(reason: string) {
    super({
      code: ErrorCodes.AGENT_ENROLLMENT_FAILED,
      message: `Agent enrollment failed: ${reason}`,
      statusCode: 400,
      isOperational: true,
    });
  }
}

export class AgentTokenInvalidError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.AGENT_TOKEN_INVALID,
      message: 'Agent authentication token is invalid or expired.',
      statusCode: 401,
      isOperational: true,
    });
  }
}

export class AgentVersionUnsupportedError extends AppError {
  constructor(version: string) {
    super({
      code: ErrorCodes.AGENT_VERSION_UNSUPPORTED,
      message: `Agent version '${version}' is no longer supported. Please update.`,
      statusCode: 400,
      isOperational: true,
    });
  }
}
