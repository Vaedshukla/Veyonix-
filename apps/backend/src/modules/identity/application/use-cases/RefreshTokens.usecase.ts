import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import type { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import type { ITokenService } from '../../domain/services/ITokenService';
import type { IAuditLogger } from '../../domain/services/IAuditLogger';
import { RefreshTokenEntity } from '../../domain/entities/RefreshToken.entity';
import {
  InvalidRefreshTokenError,
  RefreshTokenFamilyCompromisedError,
} from '../../domain/errors/IdentityDomainError';
import type { RefreshResultDto } from '../dtos/auth.dto';

export interface RefreshTokensDeps {
  userRepository: IUserRepository;
  refreshTokenRepository: IRefreshTokenRepository;
  sessionRepository: ISessionRepository;
  tokenService: ITokenService;
  auditLogger: IAuditLogger;
  config: { jwtRefreshTtlSeconds: number; organizationId?: string };
}

export interface RefreshTokensContext {
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
}

export class RefreshTokensUseCase {
  constructor(private readonly deps: RefreshTokensDeps) {}

  async execute(
    rawToken: string,
    ctx: RefreshTokensContext = {},
  ): Promise<{ result: RefreshResultDto; newRefreshToken: string }> {
    // 1. Hash the incoming token to look up in DB
    const tokenHash = this.deps.tokenService.hashToken(rawToken);
    const existingToken = await this.deps.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!existingToken) {
      throw new InvalidRefreshTokenError();
    }

    // 2. Detect reuse attack (token already used)
    if (existingToken.isUsed() || existingToken.isRevoked()) {
      // Reuse detected! Revoke the ENTIRE family to protect the account
      await this.deps.refreshTokenRepository.revokeFamily(existingToken.familyId);
      await this.deps.auditLogger.log({
        action: 'LOGOUT', // Closest audit action for family revocation
        actorId: existingToken.userId,
        source: 'SYSTEM',
        severity: 'CRITICAL',
        correlationId: ctx.correlationId,
        ipAddress: ctx.ipAddress,
        details: {
          reason: 'REFRESH_TOKEN_REUSE_DETECTED',
          familyId: existingToken.familyId,
        },
      });
      throw new RefreshTokenFamilyCompromisedError();
    }

    // 3. Check expiry
    if (existingToken.isExpired()) {
      throw new InvalidRefreshTokenError();
    }

    // 4. Mark old token as used (rotation)
    await this.deps.refreshTokenRepository.markUsed(existingToken.id);

    // 5. Lookup user
    const user = await this.deps.userRepository.findById(existingToken.userId);
    if (!user || !user.isActive) {
      throw new InvalidRefreshTokenError();
    }

    // 6. Validate session still exists
    const sessions = await this.deps.sessionRepository.findActiveByUserId(user.id);
    if (sessions.length === 0) {
      throw new InvalidRefreshTokenError();
    }
    const session = sessions[0]!;

    // 7. Touch session last active
    await this.deps.sessionRepository.updateLastActive(session.id);

    // 8. Issue new Access Token
    const orgId = this.deps.config.organizationId ?? 'unknown';
    const accessToken = this.deps.tokenService.generateAccessToken({
      sub: user.id,
      sessionId: session.id,
      email: user.email,
      role: 'STUDENT',
      orgId,
    });

    // 9. Issue new Refresh Token (rotation — same familyId, incremented counter)
    const newRawToken = this.deps.tokenService.generateRefreshToken();
    const newHash = this.deps.tokenService.hashToken(newRawToken);
    const rtExpiresAt = new Date();
    rtExpiresAt.setSeconds(rtExpiresAt.getSeconds() + this.deps.config.jwtRefreshTtlSeconds);

    const newRefreshTokenEntity = RefreshTokenEntity.create({
      userId: user.id,
      tokenHash: newHash,
      familyId: existingToken.familyId,
      rotatedFromTokenId: existingToken.id,
      rotationCounter: existingToken.rotationCounter + 1,
      expiresAt: rtExpiresAt,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    await this.deps.refreshTokenRepository.create(newRefreshTokenEntity);

    return {
      result: {
        accessToken,
        session: {
          id: session.id,
          createdAt: session.createdAt.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
          deviceName: session.deviceName,
          ipAddress: session.ipAddress,
        },
      },
      newRefreshToken: newRawToken,
    };
  }
}
