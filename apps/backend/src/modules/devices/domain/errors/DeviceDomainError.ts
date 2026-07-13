export class DeviceDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DeviceNotFoundError extends DeviceDomainError {
  constructor(id: string) {
    super(`Device with id ${id} not found`, 'DEVICE_NOT_FOUND', 404);
  }
}

export class InvalidEnrollmentTokenError extends DeviceDomainError {
  constructor() {
    super('Invalid enrollment token', 'INVALID_ENROLLMENT_TOKEN', 400);
  }
}

export class TokenExpiredOrExhaustedError extends DeviceDomainError {
  constructor() {
    super('Enrollment token expired or exhausted uses', 'TOKEN_EXPIRED_OR_EXHAUSTED', 400);
  }
}

export class DeviceSuspendedError extends DeviceDomainError {
  constructor(id: string) {
    super(`Device ${id} is suspended or decommissioned`, 'DEVICE_SUSPENDED', 403);
  }
}

export class DeviceAlreadyEnrolledError extends DeviceDomainError {
  constructor() {
    super('Device is already enrolled', 'DEVICE_ALREADY_ENROLLED', 409);
  }
}
