import { generateId } from '@shared/utils/id';
import { hashToken } from '@shared/utils/hash';
import {
  InvalidCredentialsError,
  TokenExpiredError,
  RefreshTokenReuseError,
  AccountDisabledError,
} from '../../domain/errors/AuthErrors';
import type { AuthRepository } from '../../domain/repositories/auth.repository';
import type { TokenProvider } from '../../infrastructure/jwt/jwt.adapter';
import type { RefreshTokenCommand } from './RefreshToken.command';
import type { TokenPair, CurrentUser } from '@veyonix/shared-types';

export interface RefreshTokenResult {
  user: CurrentUser;
  tokens: TokenPair;
}

export class RefreshTokenHandler {
  private readonly authRepository: AuthRepository;
  private readonly tokenProvider: TokenProvider;

  constructor(dependencies: {
    authRepository: AuthRepository;
    tokenProvider: TokenProvider;
  }) {
    this.authRepository = dependencies.authRepository;
    this.tokenProvider = dependencies.tokenProvider;
  }

  async handle(command: RefreshTokenCommand, ipAddress?: string, userAgent?: string): Promise<RefreshTokenResult> {
    const tokenHash = hashToken(command.refreshToken);
    
    const dbToken = await this.authRepository.findRefreshToken(tokenHash);
    if (!dbToken) {
      throw new InvalidCredentialsError();
    }

    // ── Token Reuse Detection ──
    if (dbToken.usedAt !== null || dbToken.revokedAt !== null) {
      // Revoke all tokens in family immediately for user security
      await this.authRepository.revokeTokenFamily(dbToken.familyId);
      throw new RefreshTokenReuseError();
    }

    // ── Expiration Check ──
    if (dbToken.expiresAt.getTime() < Date.now()) {
      throw new TokenExpiredError();
    }

    const user = await this.authRepository.findById(dbToken.userId);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new AccountDisabledError();
    }

    // ── Rotate Tokens ──
    // 1. Mark current refresh token as used
    await this.authRepository.markRefreshTokenUsed(dbToken.id);

    const sessionId = generateId();
    const newRefreshTokenId = generateId();
    const familyId = dbToken.familyId; // Retain family ID for tracking rotation

    // 2. Sign New Tokens
    const accessToken = this.tokenProvider.signAccess({
      sub: user.id,
      email: user.email,
      role: user.role as any,
      orgId: user.organizationId,
      sessionId,
    });

    const rawRefreshToken = generateId();
    const newRefreshTokenHash = hashToken(rawRefreshToken);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.authRepository.saveRefreshToken({
      id: newRefreshTokenId,
      userId: user.id,
      tokenHash: newRefreshTokenHash,
      familyId,
      expiresAt: refreshExpiresAt,
      ipAddress,
      userAgent,
    });

    // 3. Create Session
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.authRepository.createSession({
      id: sessionId,
      userId: user.id,
      expiresAt: sessionExpiresAt,
      ipAddress,
      userAgent,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: `${user.id}`,
        role: user.role as any,
        organizationId: user.organizationId,
        sessionId,
      },
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: 900,
      },
    };
  }
}
