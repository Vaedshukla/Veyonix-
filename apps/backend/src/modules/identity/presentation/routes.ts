import type { FastifyInstance } from 'fastify';
import type { AuthController } from './controllers/AuthController';
import type { IdentityUsersController } from './controllers/UsersController';
import { createAuthMiddleware, type AuthMiddlewareDeps } from './middlewares/authenticate.middleware';

export interface IdentityRoutesDeps {
  authController: AuthController;
  usersController: IdentityUsersController;
  authMiddlewareDeps: AuthMiddlewareDeps;
}

export async function registerIdentityRoutes(
  fastify: FastifyInstance,
  deps: IdentityRoutesDeps,
): Promise<void> {
  const authenticate = createAuthMiddleware(deps.authMiddlewareDeps);

  // ── Auth Routes ─────────────────────────────────────────────────────────
  fastify.post(
    '/api/v1/auth/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Register a new user account',
        description: 'Creates a new user, generates a session, and returns access + refresh tokens.',
      },
    },
    (req, reply) => deps.authController.register(req, reply),
  );

  fastify.post(
    '/api/v1/auth/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Authenticate with email and password',
        description: 'Returns an access token (JWT) and sets an HttpOnly refresh token cookie.',
      },
    },
    (req, reply) => deps.authController.login(req, reply),
  );

  fastify.post(
    '/api/v1/auth/logout',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Invalidate the current session',
        security: [{ BearerAuth: [] }],
      },
    },
    (req, reply) => deps.authController.logout(req, reply),
  );

  fastify.post(
    '/api/v1/auth/refresh',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Rotate refresh token and issue new access token',
        description: 'Reads the refresh token from the HttpOnly cookie. Uses token family rotation to detect theft.',
      },
    },
    (req, reply) => deps.authController.refresh(req, reply),
  );

  fastify.post(
    '/api/v1/auth/password-reset',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Request a password reset email',
        description: 'Always returns 200 to prevent email enumeration.',
      },
    },
    (req, reply) => deps.authController.requestPasswordReset(req, reply),
  );

  fastify.post(
    '/api/v1/auth/password-reset/confirm',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Confirm password reset with token',
      },
    },
    (req, reply) => deps.authController.resetPassword(req, reply),
  );

  fastify.post(
    '/api/v1/auth/verify-email',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Verify email address with token',
      },
    },
    (req, reply) => deps.authController.verifyEmail(req, reply),
  );

  fastify.post(
    '/api/v1/auth/sessions/revoke',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Revoke a specific session by ID',
        security: [{ BearerAuth: [] }],
      },
    },
    (req, reply) => deps.authController.revokeSession(req, reply),
  );

  // ── User Routes ─────────────────────────────────────────────────────────
  fastify.get(
    '/api/v1/users/me',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Users'],
        summary: 'Get the authenticated user profile',
        security: [{ BearerAuth: [] }],
      },
    },
    (req, reply) => deps.usersController.getMe(req, reply),
  );

  fastify.get(
    '/api/v1/users/me/sessions',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Users'],
        summary: 'List all active sessions for the current user',
        security: [{ BearerAuth: [] }],
      },
    },
    (req, reply) => deps.usersController.getSessions(req, reply),
  );
}
