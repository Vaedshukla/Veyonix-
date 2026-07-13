import type { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import type { IAuditLogger } from '../../domain/services/IAuditLogger';
import { SessionNotFoundError } from '../../domain/errors/IdentityDomainError';

export interface RevokeSessionDeps {
  sessionRepository: ISessionRepository;
  auditLogger: IAuditLogger;
}

export interface RevokeSessionContext {
  requestingUserId: string;
  correlationId?: string | null;
  ipAddress?: string | null;
}

export class RevokeSessionUseCase {
  constructor(private readonly deps: RevokeSessionDeps) {}

  async execute(sessionId: string, ctx: RevokeSessionContext): Promise<void> {
    const session = await this.deps.sessionRepository.findById(sessionId);

    if (!session || session.isRevoked()) {
      throw new SessionNotFoundError();
    }

    // Ensure users can only revoke their own sessions
    if (session.userId !== ctx.requestingUserId) {
      throw new SessionNotFoundError(); // Don't reveal existence of other sessions
    }

    await this.deps.sessionRepository.revoke(sessionId, 'USER_REVOKED');

    await this.deps.auditLogger.log({
      action: 'SESSION_REVOKED',
      actorId: ctx.requestingUserId,
      targetId: sessionId,
      source: 'WEB',
      severity: 'INFO',
      correlationId: ctx.correlationId,
      ipAddress: ctx.ipAddress,
    });
  }
}
