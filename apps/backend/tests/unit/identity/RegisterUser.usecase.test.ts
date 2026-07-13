import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RegisterUserUseCase } from '../../../src/modules/identity/application/use-cases/RegisterUser.usecase';
import {
  createMockUserRepository,
  createMockSessionRepository,
  createMockRefreshTokenRepository,
  createMockPasswordHasher,
  createMockTokenService,
  createMockAuditLogger,
} from '../../helpers';
import type { MockUserRepository } from '../../helpers';
import { EmailAlreadyExistsError } from '../../../src/modules/identity/domain/errors/IdentityDomainError';
import { UserEntity } from '../../../src/modules/identity/domain/entities/User.entity';
import { SessionEntity } from '../../../src/modules/identity/domain/entities/Session.entity';
import { RefreshTokenEntity } from '../../../src/modules/identity/domain/entities/RefreshToken.entity';

function makeMockRoleRepository() {
  return {
    findById: vi.fn(),
    findByName: vi.fn(),
    findDefaultForOrganization: vi.fn().mockResolvedValue(null),
    findSystemRole: vi.fn().mockResolvedValue(null),
    getPermissionsForUser: vi.fn().mockResolvedValue([]),
  };
}

function makeValidDto() {
  return {
    email: 'test@example.com',
    password: 'TestPass123!',
    firstName: 'John',
    lastName: 'Doe',
    organizationId: '01234567-0123-7000-8000-000000000001',
  };
}

describe('RegisterUserUseCase', () => {
  let userRepository: MockUserRepository;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    const sessionRepository = createMockSessionRepository();
    const refreshTokenRepository = createMockRefreshTokenRepository();
    const passwordHasher = createMockPasswordHasher();
    const tokenService = createMockTokenService();
    const auditLogger = createMockAuditLogger();
    const roleRepository = makeMockRoleRepository();

    // Return a saved user entity from create
    userRepository.create.mockImplementation(async (user: UserEntity) => user);
    sessionRepository.create.mockImplementation(async (s: SessionEntity) => s);
    refreshTokenRepository.create.mockImplementation(async (rt: RefreshTokenEntity) => rt);

    useCase = new RegisterUserUseCase({
      userRepository,
      roleRepository,
      sessionRepository,
      refreshTokenRepository,
      passwordHasher,
      tokenService,
      auditLogger,
      config: { jwtRefreshTtlSeconds: 2592000, jwtAccessTtlSeconds: 900 },
    });
  });

  it('registers a new user and returns auth result', async () => {
    userRepository.findByNormalizedEmail.mockResolvedValue(null);

    const dto = makeValidDto();
    const { result, refreshToken, event } = await useCase.execute(dto, { ipAddress: '127.0.0.1' });

    expect(result.user.email).toBe(dto.email);
    expect(result.accessToken).toBe('mock.access.token');
    expect(refreshToken).toBeDefined();
    expect(event.eventType).toBe('identity.user.registered');
    expect(event.email).toBe(dto.email);
  });

  it('throws EmailAlreadyExistsError if email is taken', async () => {
    const existingUser = UserEntity.reconstitute({
      id: 'existing-id',
      email: 'test@example.com',
      normalizedEmail: 'test@example.com',
      passwordHash: 'hash',
      firstName: 'Jane',
      lastName: 'Doe',
      isActive: true,
      isEmailVerified: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    userRepository.findByNormalizedEmail.mockResolvedValue(existingUser);

    await expect(useCase.execute(makeValidDto())).rejects.toThrow(EmailAlreadyExistsError);
  });

  it('rejects invalid email format', async () => {
    await expect(
      useCase.execute({ ...makeValidDto(), email: 'not-an-email' }),
    ).rejects.toThrow();
  });

  it('rejects weak passwords', async () => {
    await expect(
      useCase.execute({ ...makeValidDto(), password: '123' }),
    ).rejects.toThrow();
  });
});
