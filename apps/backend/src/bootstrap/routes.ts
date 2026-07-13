import type { FastifyInstance } from 'fastify';

import { healthRoutes } from '@modules/health/presentation/routes';
import { systemRoutes } from '@modules/system/presentation/routes';
import { metricsRoutes } from '@modules/metrics/presentation/routes';
import { authRoutes } from '@modules/auth/presentation/routes';
import { userRoutes } from '@modules/users/presentation/routes';
import { organizationRoutes } from '@modules/organizations/presentation/routes';
import { deviceRoutes } from '@modules/devices/presentation/routes';
import { agentRoutes } from '@modules/agent/presentation/routes';
import { policyRoutes } from '@modules/policies/presentation/routes';
import { notificationRoutes } from '@modules/notifications/presentation/routes';
import { analyticsRoutes } from '@modules/analytics/presentation/routes';
import { reportRoutes } from '@modules/reports/presentation/routes';
import { registerIdentityRoutes } from '@modules/identity/presentation/routes';
import { registerOrganizationRoutes } from '@modules/organizations/presentation/routes';

const API_V1_PREFIX = '/api/v1';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // ── Infrastructure routes (no version prefix) ────────────────────────
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(metricsRoutes, { prefix: '/metrics' });
  await app.register(systemRoutes, { prefix: '/system' });

  // ── API v1 routes ────────────────────────────────────────────────────
  await app.register(
    async (v1) => {
      await v1.register(authRoutes, { prefix: '/auth' });
      await v1.register(userRoutes, { prefix: '/users' });
      await v1.register(organizationRoutes, { prefix: '/organizations' });
      await v1.register(deviceRoutes, { prefix: '/devices' });
      await v1.register(agentRoutes, { prefix: '/agent' });
      await v1.register(policyRoutes, { prefix: '/policies' });
      await v1.register(notificationRoutes, { prefix: '/notifications' });
      await v1.register(analyticsRoutes, { prefix: '/analytics' });
      await v1.register(reportRoutes, { prefix: '/reports' });
    },
    { prefix: API_V1_PREFIX },
  );

  // ── Identity module routes (self-prefixed, registered at app level) ──
  const c = app.container.cradle as Record<string, unknown>;
  await registerIdentityRoutes(app, {
    authController: c.identityAuthController as import('@modules/identity/presentation/controllers/AuthController').AuthController,
    usersController: c.identityUsersController as import('@modules/identity/presentation/controllers/UsersController').IdentityUsersController,
    authMiddlewareDeps: {
      tokenService: c.jwtTokenService as import('@modules/identity/infrastructure/services/JwtTokenService').JwtTokenService,
      sessionCache: c.sessionCache as import('@modules/identity/infrastructure/services/RedisSessionCache').RedisSessionCache,
      userRepository: c.identityUserRepository as import('@modules/identity/domain/repositories/IUserRepository').IUserRepository,
    },
  });

  // ── Organizations v2 routes (self-prefixed at /api/v1/organizations) ──────
  await registerOrganizationRoutes(app, {
    organizationsController: c.organizationsV2Controller as import('@modules/organizations/presentation/controllers/OrganizationsController').OrganizationsController,
    authMiddlewareDeps: {
      tokenService: c.jwtTokenService as import('@modules/identity/infrastructure/services/JwtTokenService').JwtTokenService,
      sessionCache: c.sessionCache as import('@modules/identity/infrastructure/services/RedisSessionCache').RedisSessionCache,
      userRepository: c.identityUserRepository as import('@modules/identity/domain/repositories/IUserRepository').IUserRepository,
    },
  });
}
