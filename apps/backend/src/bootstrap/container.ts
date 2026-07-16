import type { FastifyInstance } from 'fastify';
import {
  createContainer,
  InjectionMode,
  asValue,
  asClass,
  asFunction,
} from 'awilix';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

// Repositories
import { PrismaAuthRepository } from '@modules/auth/infrastructure/prisma/auth.prisma.repository';
import { PrismaOrganizationsRepository } from '@modules/organizations/infrastructure/prisma/organizations.prisma.repository';
import { PrismaUsersRepository } from '@modules/users/infrastructure/prisma/users.prisma.repository';
import { PrismaDevicesRepository } from '@modules/devices/infrastructure/prisma/devices.prisma.repository';
import { PrismaPoliciesRepository } from '@modules/policies/infrastructure/prisma/policies.prisma.repository';
import { PrismaAnalyticsRepository } from '@modules/analytics/infrastructure/prisma/analytics.prisma.repository';
import { PrismaReportsRepository } from '@modules/reports/infrastructure/prisma/reports.prisma.repository';

// Policy Module Components
import { PrismaPolicyRepository } from '@modules/policies/infrastructure/prisma/PrismaPolicyRepository';
import { PrismaPolicyAssignmentRepository } from '@modules/policies/infrastructure/prisma/PrismaPolicyAssignmentRepository';
import { PrismaCompiledPolicyRepository } from '@modules/policies/infrastructure/prisma/PrismaCompiledPolicyRepository';
import { RedisPolicyCache } from '@modules/policies/infrastructure/redis/RedisPolicyCache';
import { PolicyUpdateProducer } from '@modules/policies/infrastructure/jobs/PolicyUpdateProducer';
import { PolicyCompilationWorker } from '@modules/policies/infrastructure/jobs/PolicyCompilationWorker';
import { PolicyNotificationPublisher } from '@modules/policies/infrastructure/websockets/PolicyNotificationPublisher';
import { AdminPolicyController } from '@modules/policies/presentation/controllers/AdminPolicyController';
import { AgentPolicyController } from '@modules/policies/presentation/controllers/AgentPolicyController';

// Infrastructure Providers
import { Argon2HashingProvider } from '@modules/auth/infrastructure/hashing/argon2.adapter';
import { JwtTokenProvider } from '@modules/auth/infrastructure/jwt/jwt.adapter';
import { LocalStorageAdapter } from '@shared/storage/local-storage.adapter';
import { RedisConnectionRegistry } from '@/websocket/redis-registry.adapter';
import { BullMQEventBus } from '@shared/events/bullmq-event-bus';

// Command Handlers
import { RegisterUserHandler } from '@modules/auth/application/commands/RegisterUser.handler';
import { LoginUserHandler } from '@modules/auth/application/commands/LoginUser.handler';
import { RefreshTokenHandler } from '@modules/auth/application/commands/RefreshToken.handler';
import { LogoutUserHandler } from '@modules/auth/application/commands/LogoutUser.handler';
import { CreateSchoolHandler } from '@modules/organizations/application/commands/CreateSchool.handler';
import { EnrollAgentHandler } from '@modules/agent/application/commands/EnrollAgent.handler';
import { ProcessHeartbeatHandler } from '@modules/agent/application/commands/ProcessHeartbeat.handler';
import { IssueCommandHandler } from '@modules/devices/application/commands/IssueCommand.handler';
import { CreatePolicyHandler } from '@modules/policies/application/commands/CreatePolicy.handler';
import { CreatePolicyVersionHandler } from '@modules/policies/application/commands/CreatePolicyVersion.handler';
import { LogTelemetryHandler } from '@modules/analytics/application/commands/LogTelemetry.handler';
import { CreateReportHandler } from '@modules/reports/application/commands/CreateReport.handler';

// Query Handlers
import { GetUserProfileHandler } from '@modules/users/application/queries/GetUserProfile.handler';

// Controllers
import { AuthController } from '@modules/auth/presentation/controllers/auth.controller';
import { UsersController } from '@modules/users/presentation/controllers/users.controller';
import { OrganizationsController } from '@modules/organizations/presentation/controllers/organizations.controller';
import { AgentController } from '@modules/agent/presentation/controllers/agent.controller';
import { DevicesController } from '@modules/devices/presentation/controllers/devices.controller';
import { PoliciesController } from '@modules/policies/presentation/controllers/policies.controller';
import { AnalyticsController } from '@modules/analytics/presentation/controllers/analytics.controller';
import { ReportsController } from '@modules/reports/presentation/controllers/reports.controller';

import { env } from '@config/index';
import { redisUrl, redisConfig } from '@config/redis';

// Identity Module — Infrastructure
import { PrismaUserRepository } from '@modules/identity/infrastructure/repositories/PrismaUserRepository';
import { PrismaSessionRepository } from '@modules/identity/infrastructure/repositories/PrismaSessionRepository';
import { PrismaRefreshTokenRepository } from '@modules/identity/infrastructure/repositories/PrismaRefreshTokenRepository';
import { PrismaRoleRepository } from '@modules/identity/infrastructure/repositories/PrismaRoleRepository';
import { Argon2PasswordHasher } from '@modules/identity/infrastructure/services/Argon2PasswordHasher';
import { JwtTokenService } from '@modules/identity/infrastructure/services/JwtTokenService';
import { RedisSessionCache } from '@modules/identity/infrastructure/services/RedisSessionCache';
import { PrismaAuditLogPublisher } from '@modules/identity/infrastructure/messaging/AuditLogPublisher';

// Identity Module — Application Use Cases
import { RegisterUserUseCase } from '@modules/identity/application/use-cases/RegisterUser.usecase';
import { LoginUserUseCase } from '@modules/identity/application/use-cases/LoginUser.usecase';
import { LogoutUserUseCase } from '@modules/identity/application/use-cases/LogoutUser.usecase';
import { RefreshTokensUseCase } from '@modules/identity/application/use-cases/RefreshTokens.usecase';
import { VerifyEmailUseCase } from '@modules/identity/application/use-cases/VerifyEmail.usecase';
import { RequestPasswordResetUseCase } from '@modules/identity/application/use-cases/RequestPasswordReset.usecase';
import { ResetPasswordUseCase } from '@modules/identity/application/use-cases/ResetPassword.usecase';
import { RevokeSessionUseCase } from '@modules/identity/application/use-cases/RevokeSession.usecase';

// Identity Module — Presentation
import { AuthController as IdentityAuthController } from '@modules/identity/presentation/controllers/AuthController';
import { IdentityUsersController } from '@modules/identity/presentation/controllers/UsersController';

// Organizations Module — Infrastructure
import { PrismaTenantRepository } from '@modules/organizations/infrastructure/repositories/PrismaTenantRepository';
import { PrismaOrganizationRepository } from '@modules/organizations/infrastructure/repositories/PrismaOrganizationRepository';
import { PrismaMembershipRepository } from '@modules/organizations/infrastructure/repositories/PrismaMembershipRepository';

// Organizations Module — Application Use Cases
import { CreateOrganizationUseCase } from '@modules/organizations/application/use-cases/CreateOrganization.usecase';
import { UpdateOrganizationUseCase } from '@modules/organizations/application/use-cases/UpdateOrganization.usecase';
import { InviteUserUseCase } from '@modules/organizations/application/use-cases/InviteUser.usecase';
import { AssignRoleUseCase } from '@modules/organizations/application/use-cases/AssignRole.usecase';
import { ListOrganizationMembersUseCase } from '@modules/organizations/application/use-cases/ListOrganizationMembers.usecase';

// Organizations Module — Presentation
import { OrganizationsController as OrganizationsV2Controller } from '@modules/organizations/presentation/controllers/OrganizationsController';

// Devices Module
import { PrismaDeviceRepository } from '@modules/devices/infrastructure/repositories/PrismaDeviceRepository';
import { PrismaDeviceAssignmentRepository } from '@modules/devices/infrastructure/repositories/PrismaDeviceAssignmentRepository';
import { PrismaEnrollmentTokenRepository } from '@modules/devices/infrastructure/repositories/PrismaEnrollmentTokenRepository';
import { AgentApiController } from '@modules/devices/presentation/controllers/AgentApiController';
import { AdminDevicesController } from '@modules/devices/presentation/controllers/AdminDevicesController';
import { requireDeviceAuth } from '@modules/devices/presentation/middlewares/requireDeviceAuth.middleware';

/**
 * Awilix DI Container Bootstrap
 *
 * SINGLETON: Created once, shared across all requests (DB, Redis, Services).
 * SCOPED:    Created once per request (repositories with request context).
 * TRANSIENT: New instance on every resolution (rarely needed).
 *
 * Services are registered here. As Phase 2 modules are built, their
 * registrations are added to this file.
 */
export async function registerContainer(app: FastifyInstance): Promise<void> {
  const container = createContainer({ injectionMode: InjectionMode.PROXY });

  // ── Infrastructure ────────────────────────────────────────────────────
  const prisma = new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
  });

  await prisma.$connect();
  app.log.info('✅ PostgreSQL connected via Prisma');

  const redis = new Redis(redisUrl, {
    ...redisConfig,
    lazyConnect: false,
  });

  redis.on('connect', () => app.log.info('✅ Redis connected'));
  redis.on('error', (err: Error) => app.log.error(err, '❌ Redis error'));

  // ── Register core singletons ─────────────────────────────────────────
  container.register({
    // Infrastructure
    prisma: asValue(prisma),
    redis: asValue(redis),
    logger: asValue(app.log),
    env: asValue(env),
    storageProvider: asClass(LocalStorageAdapter).singleton(),
    connectionRegistry: asClass(RedisConnectionRegistry).singleton(),
    eventBus: asClass(BullMQEventBus).singleton(),

    // Repositories
    authRepository: asClass(PrismaAuthRepository).singleton(),
    organizationsRepository: asClass(PrismaOrganizationsRepository).singleton(),
    usersRepository: asClass(PrismaUsersRepository).singleton(),
    devicesRepository: asClass(PrismaDevicesRepository).singleton(),
    policiesRepository: asClass(PrismaPoliciesRepository).singleton(),
    
    // Policy Module V2
    policyRepository: asClass(PrismaPolicyRepository).singleton(),
    policyAssignmentRepository: asClass(PrismaPolicyAssignmentRepository).singleton(),
    compiledPolicyRepository: asClass(PrismaCompiledPolicyRepository).singleton(),
    redisPolicyCache: asClass(RedisPolicyCache).singleton(),
    policyUpdateProducer: asClass(PolicyUpdateProducer).singleton(),
    policyCompilationWorker: asClass(PolicyCompilationWorker).singleton(),
    policyNotificationPublisher: asClass(PolicyNotificationPublisher).singleton(),
    adminPolicyController: asClass(AdminPolicyController).singleton(),
    agentPolicyController: asClass(AgentPolicyController).singleton(),

    analyticsRepository: asClass(PrismaAnalyticsRepository).singleton(),
    reportsRepository: asClass(PrismaReportsRepository).singleton(),

    // Infrastructure Providers
    hashingProvider: asClass(Argon2HashingProvider).singleton(),
    tokenProvider: asClass(JwtTokenProvider).singleton(),

    // Use Case Handlers
    registerUserHandler: asClass(RegisterUserHandler).singleton(),
    loginUserHandler: asClass(LoginUserHandler).singleton(),
    refreshTokenHandler: asClass(RefreshTokenHandler).singleton(),
    logoutUserHandler: asClass(LogoutUserHandler).singleton(),
    getUserProfileHandler: asClass(GetUserProfileHandler).singleton(),
    createSchoolHandler: asClass(CreateSchoolHandler).singleton(),
    enrollAgentHandler: asClass(EnrollAgentHandler).singleton(),
    processHeartbeatHandler: asClass(ProcessHeartbeatHandler).singleton(),
    issueCommandHandler: asClass(IssueCommandHandler).singleton(),
    createPolicyHandler: asClass(CreatePolicyHandler).singleton(),
    createPolicyVersionHandler: asClass(CreatePolicyVersionHandler).singleton(),
    logTelemetryHandler: asClass(LogTelemetryHandler).singleton(),
    createReportHandler: asClass(CreateReportHandler).singleton(),

    // Controllers
    authController: asClass(AuthController).singleton(),
    usersController: asClass(UsersController).singleton(),
    organizationsController: asClass(OrganizationsController).singleton(),
    agentController: asClass(AgentController).singleton(),
    devicesController: asClass(DevicesController).singleton(),
    policiesController: asClass(PoliciesController).singleton(),
    analyticsController: asClass(AnalyticsController).singleton(),
    reportsController: asClass(ReportsController).singleton(),

    // ── Identity: Repositories ───────────────────────────────────────
    identityUserRepository: asClass(PrismaUserRepository).classic().singleton(),
    identitySessionRepository: asClass(PrismaSessionRepository).classic().singleton(),
    identityRefreshTokenRepository: asClass(PrismaRefreshTokenRepository).classic().singleton(),
    identityRoleRepository: asClass(PrismaRoleRepository).classic().singleton(),

    // Use Case Aliases for Clean Architecture Resolution
    userRepository: asClass(PrismaUserRepository).classic().singleton(),
    sessionRepository: asClass(PrismaSessionRepository).classic().singleton(),
    refreshTokenRepository: asClass(PrismaRefreshTokenRepository).classic().singleton(),
    roleRepository: asClass(PrismaRoleRepository).classic().singleton(),
    tokenService: asFunction((dependencies: { env: typeof env }) => {
      return new JwtTokenService({
        accessSecret: dependencies.env.JWT_ACCESS_SECRET,
        accessTtlSeconds: dependencies.env.JWT_ACCESS_TTL,
        refreshSecret: dependencies.env.JWT_REFRESH_SECRET,
      });
    }).singleton(),
    config: asValue({
      jwtAccessTtlSeconds: 900,
      jwtRefreshTtlSeconds: 2592000,
      rememberMeTtlSeconds: 7776000,
      resetTokenTtlSeconds: 3600,
    }),

    // ── Identity: Services ──────────────────────────────────────────
    passwordHasher: asClass(Argon2PasswordHasher).singleton(),
    jwtTokenService: asFunction((dependencies: { env: typeof env }) => {
      return new JwtTokenService({
        accessSecret: dependencies.env.JWT_ACCESS_SECRET,
        accessTtlSeconds: dependencies.env.JWT_ACCESS_TTL,
        refreshSecret: dependencies.env.JWT_REFRESH_SECRET,
      });
    }).singleton(),
    sessionCache: asClass(RedisSessionCache).classic().singleton(),
    auditLogger: asClass(PrismaAuditLogPublisher).classic().singleton(),

    // ── Identity: Use Cases ─────────────────────────────────────────
    registerUserUseCase: asClass(RegisterUserUseCase).singleton(),
    loginUserUseCase: asClass(LoginUserUseCase).singleton(),
    logoutUserUseCase: asClass(LogoutUserUseCase).singleton(),
    refreshTokensUseCase: asClass(RefreshTokensUseCase).singleton(),
    verifyEmailUseCase: asClass(VerifyEmailUseCase).singleton(),
    requestPasswordResetUseCase: asClass(RequestPasswordResetUseCase).singleton(),
    resetPasswordUseCase: asClass(ResetPasswordUseCase).singleton(),
    revokeSessionUseCase: asClass(RevokeSessionUseCase).singleton(),

    // ── Identity: Controllers ───────────────────────────────────────
    identityAuthController: asClass(IdentityAuthController).singleton(),
    identityUsersController: asClass(IdentityUsersController).singleton(),

    // ── Organizations: Repositories ─────────────────────────────────
    tenantRepository: asClass(PrismaTenantRepository).classic().singleton(),
    organizationRepository: asClass(PrismaOrganizationRepository).classic().singleton(),
    membershipRepository: asClass(PrismaMembershipRepository).classic().singleton(),

    // ── Organizations: Use Cases ─────────────────────────────────────
    createOrganizationUseCase: asClass(CreateOrganizationUseCase).singleton(),
    updateOrganizationUseCase: asClass(UpdateOrganizationUseCase).singleton(),
    inviteUserUseCase: asClass(InviteUserUseCase).singleton(),
    assignRoleUseCase: asClass(AssignRoleUseCase).singleton(),
    listOrganizationMembersUseCase: asClass(ListOrganizationMembersUseCase).singleton(),

    // ── Organizations: Controller ────────────────────────────────────
    organizationsV2Controller: asClass(OrganizationsV2Controller).singleton(),

    // ── Devices Module ───────────────────────────────────────────────
    deviceRepository: asClass(PrismaDeviceRepository).classic().singleton(),
    deviceAssignmentRepository: asClass(PrismaDeviceAssignmentRepository).classic().singleton(),
    enrollmentTokenRepository: asClass(PrismaEnrollmentTokenRepository).classic().singleton(),
    agentApiController: asClass(AgentApiController).singleton(),
    adminDevicesController: asClass(AdminDevicesController).singleton(),
    requireDeviceAuth: asFunction(requireDeviceAuth).singleton(),
  });

  // Attach container to Fastify instance for request access
  app.decorate('container', container);

  // Make container scoped per request
  app.addHook('onRequest', (request, _reply, done) => {
    request.container = container.createScope();
    done();
  });

  // Cleanup on close
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
    app.log.info('PostgreSQL disconnected');
    redis.disconnect();
    app.log.info('Redis disconnected');
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    container: ReturnType<typeof createContainer>;
  }
  interface FastifyRequest {
    container: ReturnType<typeof createContainer>;
    user: import('@veyonix/shared-types').CurrentUser | null;
    deviceId: string | null;
  }
}
