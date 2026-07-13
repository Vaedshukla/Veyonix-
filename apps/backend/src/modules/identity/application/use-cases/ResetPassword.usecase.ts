import { PrismaClient } from '@prisma/client';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import type { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import type { IPasswordHasher } from '../../domain/services/IPasswordHasher';
import type { IAuditLogger } from '../../domain/services/IAuditLogger';
import type { ITokenService } from '../../domain/services/ITokenService';
import { SecurePassword } from '../../domain/value-objects/SecurePassword';
import { InvalidTokenError } from '../../domain/errors/IdentityDomainError';

export interface ResetPasswordDeps {
  userRepository: IUserRepository;
  sessionRepository: ISessionRepository;
  passwordHasher: IPasswordHasher;
  auditLogger: IAuditLogger;
  tokenService: ITokenService;
  prisma: PrismaClient;
}

export interface ResetPasswordContext {
  correlationId?: string | null;
  ipAddress?: string | null;
}

export class ResetPasswordUseCase {
  constructor(private readonly deps: ResetPasswordDeps) {}

  async execute(
    rawToken: string,
    newPassword: string,
    ctx: ResetPasswordContext = {},
  ): Promise<void> {
    // 1. Validate password strength
    SecurePassword.create(newPassword);

    // 2. Lookup the token
    const tokenHash = this.deps.tokenService.hashToken(rawToken);
    const record = await this.deps.prisma.passwordReset.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new InvalidTokenError();
    }

    // 3. Mark token as used atomically
    await this.deps.prisma.passwordReset.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    // 4. Hash and update password
    const user = await this.deps.userRepository.findById(record.userId);
    if (!user) throw new InvalidTokenError();

    const newHash = await this.deps.passwordHasher.hash(newPassword);
    user.changePassword(newHash);
    await this.deps.userRepository.update(user);

    // 5. Revoke all sessions (force re-login on all devices)
    await this.deps.sessionRepository.revokeAllForUser(user.id, 'PASSWORD_RESET');

    // 6. Audit log
    await this.deps.auditLogger.log({
      action: 'PASSWORD_CHANGED',
      actorId: user.id,
      targetId: user.id,
      source: 'WEB',
      severity: 'WARNING',
      correlationId: ctx.correlationId,
      ipAddress: ctx.ipAddress,
    });
  }
}
