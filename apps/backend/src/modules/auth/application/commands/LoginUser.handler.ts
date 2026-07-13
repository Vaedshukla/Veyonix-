import { generateId } from '@shared/utils/id';
import { hashToken } from '@shared/utils/hash';
import { InvalidCredentialsError, AccountDisabledError } from '../../domain/errors/AuthErrors';
import { DomainEventType, publishEvent } from '@shared/events/event-bus';
import type { AuthRepository } from '../../domain/repositories/auth.repository';
import type { HashingProvider } from '../../infrastructure/hashing/argon2.adapter';
import type { TokenProvider } from '../../infrastructure/jwt/jwt.adapter';
import type { LoginUserCommand } from './LoginUser.command';
import type { TokenPair, CurrentUser } from '@veyonix/shared-types';

export interface LoginUserResult {
  user: CurrentUser;
  tokens: TokenPair;
}

export class LoginUserHandler {
  private readonly authRepository: AuthRepository;
  private readonly hashingProvider: HashingProvider;
  private readonly tokenProvider: TokenProvider;

  constructor(dependencies: {
    authRepository: AuthRepository;
    hashingProvider: HashingProvider;
    tokenProvider: TokenProvider;
  }) {
    this.authRepository = dependencies.authRepository;
    this.hashingProvider = dependencies.hashingProvider;
    this.tokenProvider = dependencies.tokenProvider;
  }

  async handle(command: LoginUserCommand, ipAddress?: string, userAgent?: string): Promise<LoginUserResult> {
    const user = await this.authRepository.findByEmail(command.email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new AccountDisabledError();
    }

    // 1. Verify Password
    const isValid = await this.hashingProvider.compare(command.password, user.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    // 2. Generate Identifiers
    const sessionId = generateId();
    const refreshTokenId = generateId();
    const familyId = generateId();

    // 3. Sign Tokens
    const accessToken = this.tokenProvider.signAccess({
      sub: user.id,
      email: user.email,
      role: user.role as any,
      orgId: user.organizationId,
      sessionId,
    });

    const rawRefreshToken = generateId();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.authRepository.saveRefreshToken({
      id: refreshTokenId,
      userId: user.id,
      tokenHash: refreshTokenHash,
      familyId,
      expiresAt: refreshExpiresAt,
      ipAddress,
      userAgent,
    });

    // 4. Create Session
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.authRepository.createSession({
      id: sessionId,
      userId: user.id,
      expiresAt: sessionExpiresAt,
      ipAddress,
      userAgent,
    });

    // 5. Publish Login Event
    await publishEvent(DomainEventType.USER_LOGGED_IN, {
      aggregateId: user.id,
      organizationId: user.organizationId,
      payload: {
        email: user.email,
        role: user.role,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: `${user.id}`, // Detail query can be used to resolve names later
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
