import { PrismaClient } from '@prisma/client';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import type { IAuditLogger } from '../../domain/services/IAuditLogger';
import type { ITokenService } from '../../domain/services/ITokenService';
import { NormalizedEmail } from '../../domain/value-objects/NormalizedEmail';
import { PasswordResetRequestedEvent } from '../../domain/events/PasswordResetRequestedEvent';

export interface RequestPasswordResetDeps {
  userRepository: IUserRepository;
  auditLogger: IAuditLogger;
  tokenService: ITokenService;
  prisma: PrismaClient;
  config: { resetTokenTtlSeconds: number };
}

export interface RequestPasswordResetContext {
  ipAddress?: string | null;
  correlationId?: string | null;
}

export class RequestPasswordResetUseCase {
  constructor(private readonly deps: RequestPasswordResetDeps) {}

  /**
   * Returns the event so the caller can dispatch an email via the event bus.
   * Returns null if the email doesn't exist — we silently succeed to prevent enumeration.
   */
  async execute(
    email: string,
    ctx: RequestPasswordResetContext = {},
  ): Promise<PasswordResetRequestedEvent | null> {
    const normalizedEmail = NormalizedEmail.create(email);
    const user = await this.deps.userRepository.findByNormalizedEmail(normalizedEmail.value);

    // Always respond 200 to prevent enumeration
    if (!user || !user.isActive) return null;

    // Invalidate any previously unused reset tokens for this user
    await this.deps.prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate a new token
    const rawToken = this.deps.tokenService.generateRefreshToken();
    const tokenHash = this.deps.tokenService.hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.deps.config.resetTokenTtlSeconds);

    await this.deps.prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        requestedFromIp: ctx.ipAddress,
      },
    });

    await this.deps.auditLogger.log({
      action: 'PASSWORD_RESET_REQUESTED',
      actorId: user.id,
      targetId: user.id,
      source: 'WEB',
      severity: 'INFO',
      correlationId: ctx.correlationId,
      ipAddress: ctx.ipAddress,
    });

    return new PasswordResetRequestedEvent(user.id, user.email, tokenHash, ctx.correlationId);
  }
}
