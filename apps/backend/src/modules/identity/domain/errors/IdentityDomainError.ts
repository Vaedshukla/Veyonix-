export class IdentityDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusHint: number = 400,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvalidCredentialsError extends IdentityDomainError {
  constructor() {
    super('INVALID_CREDENTIALS', 'The provided credentials are invalid.', 401);
  }
}

export class AccountLockedError extends IdentityDomainError {
  constructor(public readonly lockedUntil: Date) {
    super(
      'ACCOUNT_LOCKED',
      `This account is temporarily locked until ${lockedUntil.toISOString()}.`,
      423,
    );
  }
}

export class AccountInactiveError extends IdentityDomainError {
  constructor() {
    super('ACCOUNT_INACTIVE', 'This account has been deactivated.', 403);
  }
}

export class EmailNotVerifiedError extends IdentityDomainError {
  constructor() {
    super(
      'EMAIL_NOT_VERIFIED',
      'You must verify your email address before logging in.',
      403,
    );
  }
}

export class EmailAlreadyExistsError extends IdentityDomainError {
  constructor(email: string) {
    super(
      'EMAIL_ALREADY_EXISTS',
      `The email address '${email}' is already registered.`,
      409,
    );
  }
}

export class InvalidRefreshTokenError extends IdentityDomainError {
  constructor() {
    super(
      'INVALID_REFRESH_TOKEN',
      'The refresh token is invalid or has already been used.',
      401,
    );
  }
}

export class RefreshTokenFamilyCompromisedError extends IdentityDomainError {
  constructor() {
    super(
      'REFRESH_TOKEN_FAMILY_COMPROMISED',
      'Security alert: Token reuse detected. All sessions have been revoked.',
      401,
    );
  }
}

export class SessionNotFoundError extends IdentityDomainError {
  constructor() {
    super(
      'SESSION_NOT_FOUND',
      'The session does not exist or has already been revoked.',
      404,
    );
  }
}

export class PermissionDeniedError extends IdentityDomainError {
  constructor(permission: string) {
    super(
      'PERMISSION_DENIED',
      `You do not have the required permission: '${permission}'.`,
      403,
    );
  }
}

export class InvalidTokenError extends IdentityDomainError {
  constructor() {
    super('INVALID_TOKEN', 'The provided token is invalid or has expired.', 401);
  }
}

export class OrganizationNotFoundError extends IdentityDomainError {
  constructor(organizationId: string) {
    super(
      'ORGANIZATION_NOT_FOUND',
      `Organization '${organizationId}' was not found.`,
      404,
    );
  }
}

export class UserNotFoundError extends IdentityDomainError {
  constructor() {
    super('USER_NOT_FOUND', 'The requested user was not found.', 404);
  }
}
