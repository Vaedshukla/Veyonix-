import { PrismaClient } from '@prisma/client';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import type { IAuditLogger } from '../../domain/services/IAuditLogger';
import type { ITokenService } from '../../domain/services/ITokenService';
import { InvalidTokenError } from '../../domain/errors/IdentityDomainError';

export interface VerifyEmailDeps {
  userRepository: IUserRepository;
  auditLogger: IAuditLogger;
  tokenService: ITokenService;
  prisma: PrismaClient;
}

export interface VerifyEmailContext {
  correlationId?: string | null;
}

export class VerifyEmailUseCase {
  constructor(private readonly deps: VerifyEmailDeps) {}

  async execute(rawToken: string, ctx: VerifyEmailContext = {}): Promise<void> {
    const tokenHash = this.deps.tokenService.hashToken(rawToken);

    // Look up the token in the DB
    const record = await this.deps.prisma.emailVerification.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new InvalidTokenError();
    }

    // Mark token used
    await this.deps.prisma.emailVerification.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    // Get the user and mark email verified
    const user = await this.deps.userRepository.findById(record.userId);
    if (!user) throw new InvalidTokenError();

    user.verifyEmail();
    await this.deps.userRepository.update(user);

    await this.deps.auditLogger.log({
      action: 'EMAIL_VERIFIED',
      actorId: user.id,
      targetId: user.id,
      source: 'WEB',
      severity: 'INFO',
      correlationId: ctx.correlationId,
    });
  }
}
