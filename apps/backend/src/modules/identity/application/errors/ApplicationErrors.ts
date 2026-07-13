// Re-export domain errors for use in use cases
export {
  InvalidCredentialsError,
  AccountLockedError,
  AccountInactiveError,
  EmailNotVerifiedError,
  EmailAlreadyExistsError,
  InvalidRefreshTokenError,
  RefreshTokenFamilyCompromisedError,
  SessionNotFoundError,
  PermissionDeniedError,
  InvalidTokenError,
  UserNotFoundError,
  OrganizationNotFoundError,
  IdentityDomainError,
} from '../../domain/errors/IdentityDomainError';
