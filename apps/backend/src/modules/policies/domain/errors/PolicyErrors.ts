import { ErrorCodes } from '@veyonix/shared-config';
import { AppError } from '@shared/errors/AppError';

export class PolicyNotFoundError extends AppError {
  constructor(policyId: string) {
    super({
      code: ErrorCodes.POLICY_NOT_FOUND,
      message: `Policy '${policyId}' was not found.`,
      statusCode: 404,
      isOperational: true,
    });
  }
}

export class PolicyAlreadyAssignedError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.POLICY_ALREADY_ASSIGNED,
      message: 'This policy is already assigned to the target.',
      statusCode: 409,
      isOperational: true,
    });
  }
}
