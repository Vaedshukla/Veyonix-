import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoginUserUseCase } from '../../../src/modules/identity/application/use-cases/LoginUser.usecase';
import {
  createMockUserRepository,
  createMockSessionRepository,
  createMockRefreshTokenRepository,
  createMockPasswordHasher,
  createMockTokenService,
  createMockAuditLogger,
} from '../../helpers';
import type { MockUserRepository, MockPasswordHasher } from '../../helpers';
import {
  InvalidCredentialsError,
  AccountLockedError,
  AccountInactiveError,
  EmailNotVerifiedError,
} from '../../../src/modules/identity/domain/errors/IdentityDomainError';
import { UserEntity } from '../../../src/modules/identity/domain/entities/User.entity';
import { SessionEntity } from '../../../src/modules/identity/domain/entities/Session.entity';
import { RefreshTokenEntity } from '../../../src/modules/identity/domain/entities/RefreshToken.entity';

function makeActiveUser(
  overrides: Partial<Parameters<typeof UserEntity.reconstitute>[0]> = {},
) {
  return UserEntity.reconstitute({
    id: 'user-001',
    email: 'user@example.com',
    normalizedEmail: 'user@example.com',
    passwordHash: 'hashed_password',
    firstName: 'Alice',
    lastName: 'Smith',
    isActive: true,
    isEmailVerified: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });
}

describe('LoginUserUseCase', () => {
  let userRepository: MockUserRepository;
  let passwordHasher: MockPasswordHasher;
  let useCase: LoginUserUseCase;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    passwordHasher = createMockPasswordHasher();
    const sessionRepository = createMockSessionRepository();
    const refreshTokenRepository = createMockRefreshTokenRepository();
    const tokenService = createMockTokenService();
    const auditLogger = createMockAuditLogger();
    const roleRepository = {
      findById: vi.fn(),
      findByName: vi.fn(),
      findDefaultForOrganization: vi.fn(),
      findSystemRole: vi.fn(),
      getPermissionsForUser: vi.fn().mockResolvedValue([]),
    };

    sessionRepository.create.mockImplementation(async (s: SessionEntity) => s);
    refreshTokenRepository.create.mockImplementation(async (rt: RefreshTokenEntity) => rt);

    useCase = new LoginUserUseCase({
      userRepository,
      sessionRepository,
      refreshTokenRepository,
      roleRepository,
      passwordHasher,
      tokenService,
      auditLogger,
      config: {
        jwtRefreshTtlSeconds: 2592000,
        rememberMeTtlSeconds: 7776000,
        organizationId: 'org-001',
      },
    });
  });

  it('logs in successfully with valid credentials', async () => {
    userRepository.findByNormalizedEmail.mockResolvedValue(makeActiveUser());
    passwordHasher.verify.mockResolvedValue(true);

    const { result, refreshToken } = await useCase.execute({
      email: 'user@example.com',
      password: 'TestPass123!',
      rememberMe: false,
    });

    expect(result.user.email).toBe('user@example.com');
    expect(result.accessToken).toBe('mock.access.token');
    expect(refreshToken).toBeDefined();
  });

  it('throws InvalidCredentialsError for unknown email', async () => {
    userRepository.findByNormalizedEmail.mockResolvedValue(null);
    await expect(
      useCase.execute({ email: 'unknown@example.com', password: 'pass', rememberMe: false }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('throws InvalidCredentialsError for wrong password', async () => {
    userRepository.findByNormalizedEmail.mockResolvedValue(makeActiveUser());
    passwordHasher.verify.mockResolvedValue(false);
    await expect(
      useCase.execute({ email: 'user@example.com', password: 'wrong', rememberMe: false }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('throws AccountLockedError when account is locked', async () => {
    const lockedUntil = new Date(Date.now() + 1000 * 60 * 30);
    userRepository.findByNormalizedEmail.mockResolvedValue(
      makeActiveUser({ lockedUntil, failedLoginAttempts: 5 }),
    );
    await expect(
      useCase.execute({ email: 'user@example.com', password: 'pass', rememberMe: false }),
    ).rejects.toThrow(AccountLockedError);
  });

  it('throws AccountInactiveError for deactivated accounts', async () => {
    userRepository.findByNormalizedEmail.mockResolvedValue(makeActiveUser({ isActive: false }));
    await expect(
      useCase.execute({ email: 'user@example.com', password: 'pass', rememberMe: false }),
    ).rejects.toThrow(AccountInactiveError);
  });

  it('throws EmailNotVerifiedError for unverified emails', async () => {
    userRepository.findByNormalizedEmail.mockResolvedValue(
      makeActiveUser({ isEmailVerified: false }),
    );
    passwordHasher.verify.mockResolvedValue(true);
    await expect(
      useCase.execute({ email: 'user@example.com', password: 'pass', rememberMe: false }),
    ).rejects.toThrow(EmailNotVerifiedError);
  });
});
