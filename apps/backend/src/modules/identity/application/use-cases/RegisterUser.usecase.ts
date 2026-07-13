import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import type { IRoleRepository } from '../../domain/repositories/IRoleRepository';
import type { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import type { IPasswordHasher } from '../../domain/services/IPasswordHasher';
import type { ITokenService } from '../../domain/services/ITokenService';
import type { IAuditLogger } from '../../domain/services/IAuditLogger';
import { UserEntity } from '../../domain/entities/User.entity';
import { SessionEntity } from '../../domain/entities/Session.entity';
import { RefreshTokenEntity } from '../../domain/entities/RefreshToken.entity';
import { NormalizedEmail } from '../../domain/value-objects/NormalizedEmail';
import { SecurePassword } from '../../domain/value-objects/SecurePassword';
import { EmailAlreadyExistsError } from '../../domain/errors/IdentityDomainError';
import type { RegisterUserDto, AuthResultDto } from '../dtos/auth.dto';
import { UserRegisteredEvent } from '../../domain/events/UserRegisteredEvent';

export interface RegisterUserContext {
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
}

export interface RegisterUserDeps {
  userRepository: IUserRepository;
  roleRepository: IRoleRepository;
  sessionRepository: ISessionRepository;
  refreshTokenRepository: IRefreshTokenRepository;
  passwordHasher: IPasswordHasher;
  tokenService: ITokenService;
  auditLogger: IAuditLogger;
  config: { jwtRefreshTtlSeconds: number; jwtAccessTtlSeconds: number };
}

export class RegisterUserUseCase {
  constructor(private readonly deps: RegisterUserDeps) {}

  async execute(
    dto: RegisterUserDto,
    ctx: RegisterUserContext = {},
  ): Promise<{ result: AuthResultDto; refreshToken: string; event: UserRegisteredEvent }> {
    // 1. Validate and normalize the email
    const normalizedEmail = NormalizedEmail.create(dto.email);

    // 2. Validate password strength
    SecurePassword.create(dto.password);

    // 3. Check email uniqueness
    const existing = await this.deps.userRepository.findByNormalizedEmail(normalizedEmail.value);
    if (existing) {
      throw new EmailAlreadyExistsError(dto.email);
    }

    // 4. Hash the password
    const passwordHash = await this.deps.passwordHasher.hash(dto.password);

    // 5. Create the User entity
    const user = UserEntity.create({
      email: dto.email,
      normalizedEmail: normalizedEmail.value,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      isActive: true,
      isEmailVerified: false,
    });

    // 6. Persist the user
    const savedUser = await this.deps.userRepository.create(user);

    // 7. Assign default role (look up default role for org)
    const defaultRole =
      (await this.deps.roleRepository.findDefaultForOrganization(dto.organizationId)) ??
      (await this.deps.roleRepository.findSystemRole('TENANT_ADMIN'));
    const primaryRoleName = defaultRole?.name ?? 'STUDENT';

    // 8. Create an initial Session
    const sessionExpiresAt = new Date();
    sessionExpiresAt.setSeconds(
      sessionExpiresAt.getSeconds() + this.deps.config.jwtRefreshTtlSeconds,
    );

    const session = SessionEntity.create({
      userId: savedUser.id,
      expiresAt: sessionExpiresAt,
      ipAddress: ctx.ipAddress,
    });
    const savedSession = await this.deps.sessionRepository.create(session);

    // 9. Generate tokens
    const accessToken = this.deps.tokenService.generateAccessToken({
      sub: savedUser.id,
      sessionId: savedSession.id,
      email: savedUser.email,
      role: primaryRoleName,
      orgId: dto.organizationId,
    });

    const rawRefreshToken = this.deps.tokenService.generateRefreshToken();
    const tokenHash = this.deps.tokenService.hashToken(rawRefreshToken);

    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setSeconds(
      refreshTokenExpiresAt.getSeconds() + this.deps.config.jwtRefreshTtlSeconds,
    );

    const refreshTokenEntity = RefreshTokenEntity.create({
      userId: savedUser.id,
      tokenHash,
      expiresAt: refreshTokenExpiresAt,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    await this.deps.refreshTokenRepository.create(refreshTokenEntity);

    // 10. Emit domain event
    const event = new UserRegisteredEvent(
      savedUser.id,
      savedUser.email,
      dto.organizationId,
      ctx.correlationId,
    );

    // 11. Audit log
    await this.deps.auditLogger.log({
      action: 'USER_CREATED',
      actorId: savedUser.id,
      targetId: savedUser.id,
      organizationId: dto.organizationId,
      source: 'WEB',
      severity: 'INFO',
      correlationId: ctx.correlationId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      details: { email: savedUser.email },
    });

    return {
      result: {
        accessToken,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          isEmailVerified: savedUser.isEmailVerified,
          lastLoginAt: null,
        },
        session: {
          id: savedSession.id,
          createdAt: savedSession.createdAt.toISOString(),
          expiresAt: savedSession.expiresAt.toISOString(),
          deviceName: savedSession.deviceName,
          ipAddress: savedSession.ipAddress,
        },
      },
      refreshToken: rawRefreshToken,
      event,
    };
  }
}
