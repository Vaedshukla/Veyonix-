import type { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import type { IAuditLogger } from '../../domain/services/IAuditLogger';
import type { ITokenService } from '../../domain/services/ITokenService';

export interface LogoutUserDeps {
  sessionRepository: ISessionRepository;
  refreshTokenRepository: IRefreshTokenRepository;
  auditLogger: IAuditLogger;
  tokenService: ITokenService;
}

export interface LogoutUserContext {
  userId: string;
  sessionId: string;
  rawRefreshToken?: string | null;
  correlationId?: string | null;
  ipAddress?: string | null;
}

export class LogoutUserUseCase {
  constructor(private readonly deps: LogoutUserDeps) {}

  async execute(ctx: LogoutUserContext): Promise<void> {
    // 1. Revoke the current session
    await this.deps.sessionRepository.revoke(ctx.sessionId, 'USER_LOGOUT');

    // 2. Revoke the current refresh token family (if provided)
    if (ctx.rawRefreshToken) {
      const tokenHash = this.deps.tokenService.hashToken(ctx.rawRefreshToken);
      const token = await this.deps.refreshTokenRepository.findByTokenHash(tokenHash);
      if (token) {
        await this.deps.refreshTokenRepository.revokeFamily(token.familyId);
      }
    }

    // 3. Audit log
    await this.deps.auditLogger.log({
      action: 'LOGOUT',
      actorId: ctx.userId,
      targetId: ctx.userId,
      source: 'WEB',
      severity: 'INFO',
      correlationId: ctx.correlationId,
      ipAddress: ctx.ipAddress,
    });
  }
}
