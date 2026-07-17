import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import type { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import type { IRoleRepository } from '../../domain/repositories/IRoleRepository';
import type { IPasswordHasher } from '../../domain/services/IPasswordHasher';
import type { ITokenService } from '../../domain/services/ITokenService';
import type { IAuditLogger } from '../../domain/services/IAuditLogger';
import { SessionEntity } from '../../domain/entities/Session.entity';
import { RefreshTokenEntity } from '../../domain/entities/RefreshToken.entity';
import { NormalizedEmail } from '../../domain/value-objects/NormalizedEmail';
import {
  InvalidCredentialsError,
  AccountLockedError,
  AccountInactiveError,
  EmailNotVerifiedError,
} from '../../domain/errors/IdentityDomainError';
import type { LoginUserDto, AuthResultDto } from '../dtos/auth.dto';

export interface LoginUserContext {
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
}

export interface LoginUserDeps {
  userRepository: IUserRepository;
  sessionRepository: ISessionRepository;
  refreshTokenRepository: IRefreshTokenRepository;
  roleRepository: IRoleRepository;
  passwordHasher: IPasswordHasher;
  tokenService: ITokenService;
  auditLogger: IAuditLogger;
  // Optional prisma client for direct org membership lookup
  prisma?: { organizationMembership: { findFirst: (args: any) => Promise<any> } };
  config: {
    jwtRefreshTtlSeconds: number;
    rememberMeTtlSeconds: number;
    organizationId?: string;
  };
}

export class LoginUserUseCase {
  constructor(private readonly deps: LoginUserDeps) {}

  async execute(
    dto: LoginUserDto,
    ctx: LoginUserContext = {},
  ): Promise<{ result: AuthResultDto; refreshToken: string }> {
    const normalizedEmail = NormalizedEmail.create(dto.email);

    // 1. Lookup user by normalized email
    const user = await this.deps.userRepository.findByNormalizedEmail(normalizedEmail.value);

    if (!user) {
      // Prevent user enumeration — always throw same error
      await this.deps.auditLogger.log({
        action: 'LOGIN_FAILED',
        source: 'WEB',
        severity: 'WARNING',
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
        details: { email: dto.email, reason: 'USER_NOT_FOUND' },
      });
      throw new InvalidCredentialsError();
    }

    // 2. Check account lockout
    if (user.isLocked()) {
      throw new AccountLockedError(user.lockedUntil!);
    }

    // 3. Check account active
    if (!user.isActive) {
      throw new AccountInactiveError();
    }

    // 4. Verify password
    const isValid = await this.deps.passwordHasher.verify(dto.password, user.passwordHash);
    if (!isValid) {
      // Increment failed attempts atomically (optimistic concurrency-safe)
      await this.deps.userRepository.incrementFailedLoginAttempts(user.id);
      await this.deps.auditLogger.log({
        action: 'LOGIN_FAILED',
        actorId: user.id,
        source: 'WEB',
        severity: 'WARNING',
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
        details: { reason: 'INVALID_PASSWORD' },
      });
      throw new InvalidCredentialsError();
    }

    // 5. Check email verified
    if (!user.isEmailVerified) {
      throw new EmailNotVerifiedError();
    }

    // 6. Reset failed attempts on successful login
    await this.deps.userRepository.resetFailedLoginAttempts(user.id);

    // 7. Resolve primary role
    await this.deps.roleRepository.getPermissionsForUser(user.id);
    const primaryRole = 'STUDENT'; // Will be resolved properly once membership joins are in place

    // 8. Create Session
    const ttlSeconds = dto.rememberMe
      ? this.deps.config.rememberMeTtlSeconds
      : this.deps.config.jwtRefreshTtlSeconds;

    const sessionExpiresAt = new Date();
    sessionExpiresAt.setSeconds(sessionExpiresAt.getSeconds() + ttlSeconds);

    const session = SessionEntity.create({
      userId: user.id,
      expiresAt: sessionExpiresAt,
      ipAddress: ctx.ipAddress,
      deviceName: dto.deviceName,
      deviceType: dto.deviceType,
      platform: dto.platform,
      browser: dto.browser,
    });
    const savedSession = await this.deps.sessionRepository.create(session);

    // 9. Resolve the user's primary organization ID from membership table
    let orgId = this.deps.config.organizationId ?? '';
    if ((!orgId || orgId === 'unknown') && this.deps.prisma) {
      try {
        const membership = await this.deps.prisma.organizationMembership.findFirst({
          where: { userId: user.id },
          select: { organizationId: true },
        });
        if (membership?.organizationId) orgId = membership.organizationId;
      } catch {
        // Non-fatal: orgId will remain empty
      }
    }
    const accessToken = this.deps.tokenService.generateAccessToken({
      sub: user.id,
      sessionId: savedSession.id,
      email: user.email,
      role: primaryRole,
      orgId,
    });

    // 10. Generate and hash Refresh Token
    const rawRefreshToken = this.deps.tokenService.generateRefreshToken();
    const tokenHash = this.deps.tokenService.hashToken(rawRefreshToken);

    const rtExpiresAt = new Date();
    rtExpiresAt.setSeconds(rtExpiresAt.getSeconds() + ttlSeconds);

    const refreshToken = RefreshTokenEntity.create({
      userId: user.id,
      tokenHash,
      expiresAt: rtExpiresAt,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    await this.deps.refreshTokenRepository.create(refreshToken);

    // 11. Audit log
    await this.deps.auditLogger.log({
      action: 'LOGIN_SUCCESS',
      actorId: user.id,
      targetId: user.id,
      source: 'WEB',
      severity: 'INFO',
      correlationId: ctx.correlationId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      result: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified,
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
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
    };
  }
}
