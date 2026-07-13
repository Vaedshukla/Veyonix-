// ─── Entities ────────────────────────────────────────────────────────────────
export * from './entities/User.entity';
export * from './entities/Session.entity';
export * from './entities/RefreshToken.entity';
export * from './entities/Role.entity';
export * from './entities/Permission.entity';

// ─── Value Objects ────────────────────────────────────────────────────────────
export * from './value-objects/NormalizedEmail';
export * from './value-objects/SecurePassword';

// ─── Repository Interfaces ───────────────────────────────────────────────────
export * from './repositories/IUserRepository';
export * from './repositories/ISessionRepository';
export * from './repositories/IRefreshTokenRepository';
export * from './repositories/IRoleRepository';

// ─── Domain Service Interfaces ───────────────────────────────────────────────
export * from './services/IPasswordHasher';
export * from './services/ITokenService';
export * from './services/IAuditLogger';

// ─── Domain Events ────────────────────────────────────────────────────────────
export * from './events/IdentityDomainEvent';
export * from './events/UserRegisteredEvent';
export * from './events/UserLoggedInEvent';
export * from './events/SessionRevokedEvent';
export * from './events/PasswordResetRequestedEvent';
export * from './events/LoginFailedEvent';
export * from './events/RefreshTokenRevokedEvent';

// ─── Domain Errors ───────────────────────────────────────────────────────────
export * from './errors/IdentityDomainError';
