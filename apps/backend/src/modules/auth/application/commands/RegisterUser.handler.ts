import { generateId } from '@shared/utils/id';
import { UserEmailTakenError } from '../../../users/domain/errors/UserErrors';
import { DomainEventType, publishEvent } from '@shared/events/event-bus';
import { hashToken } from '@shared/utils/hash';
import type { AuthRepository } from '../../domain/repositories/auth.repository';
import type { OrganizationsRepository } from '../../../organizations/domain/repositories/organizations.repository';
import type { HashingProvider } from '../../infrastructure/hashing/argon2.adapter';
import type { TokenProvider } from '../../infrastructure/jwt/jwt.adapter';
import type { RegisterUserCommand } from './RegisterUser.command';
import type { TokenPair, CurrentUser } from '@veyonix/shared-types';

export interface RegisterUserResult {
  user: CurrentUser;
  tokens: TokenPair;
}

export class RegisterUserHandler {
  private readonly authRepository: AuthRepository;
  private readonly organizationsRepository: OrganizationsRepository;
  private readonly hashingProvider: HashingProvider;
  private readonly tokenProvider: TokenProvider;

  constructor(dependencies: {
    authRepository: AuthRepository;
    organizationsRepository: OrganizationsRepository;
    hashingProvider: HashingProvider;
    tokenProvider: TokenProvider;
  }) {
    this.authRepository = dependencies.authRepository;
    this.organizationsRepository = dependencies.organizationsRepository;
    this.hashingProvider = dependencies.hashingProvider;
    this.tokenProvider = dependencies.tokenProvider;
  }

  async handle(command: RegisterUserCommand, ipAddress?: string, userAgent?: string): Promise<RegisterUserResult> {
    const existing = await this.authRepository.findByEmail(command.email);
    if (existing) {
      throw new UserEmailTakenError(command.email);
    }

    // 1. Hash Password
    const passwordHash = await this.hashingProvider.hash(command.password);

    // 2. Generate UUIDs (UUID v7)
    const tenantId = generateId();
    const orgId = generateId();
    const userId = generateId();
    const sessionId = generateId();
    const refreshTokenId = generateId();
    const familyId = generateId();

    const slug = command.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const finalSlug = `${slug}-${generateId().substring(0, 8)}`;

    // 3. Create Tenant & Organization
    await this.organizationsRepository.createTenant({
      id: tenantId,
      name: command.organizationName,
      slug: finalSlug,
    });

    await this.organizationsRepository.createOrganization({
      id: orgId,
      tenantId,
      name: command.organizationName,
      slug: finalSlug,
      type: command.organizationType,
    });

    // 4. Create User
    const user = await this.authRepository.create({
      id: userId,
      email: command.email,
      passwordHash,
      role: command.role,
      organizationId: orgId,
      firstName: command.firstName,
      lastName: command.lastName,
      isActive: true,
      isEmailVerified: false,
    });

    // 5. Generate Access & Refresh Tokens
    const accessToken = this.tokenProvider.signAccess({
      sub: userId,
      email: user.email,
      role: user.role as any,
      orgId,
      sessionId,
    });

    const rawRefreshToken = generateId();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.authRepository.saveRefreshToken({
      id: refreshTokenId,
      userId,
      tokenHash: refreshTokenHash,
      familyId,
      expiresAt: refreshExpiresAt,
      ipAddress,
      userAgent,
    });

    // 6. Create Session
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.authRepository.createSession({
      id: sessionId,
      userId,
      expiresAt: sessionExpiresAt,
      ipAddress,
      userAgent,
    });

    // 7. Publish Event (Domain Event Bus)
    await publishEvent(DomainEventType.USER_REGISTERED, {
      aggregateId: userId,
      organizationId: orgId,
      payload: {
        email: user.email,
        role: user.role,
        firstName: command.firstName,
        lastName: command.lastName,
      },
    });

    return {
      user: {
        id: userId,
        email: user.email,
        fullName: `${command.firstName} ${command.lastName}`,
        role: user.role as any,
        organizationId: orgId,
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
