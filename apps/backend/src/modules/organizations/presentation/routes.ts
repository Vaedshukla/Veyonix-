import type { FastifyInstance } from 'fastify';
import type { OrganizationsController } from './controllers/OrganizationsController';
import type { AuthMiddlewareDeps } from '../../identity/presentation/middlewares/authenticate.middleware';
import { createAuthMiddleware } from '../../identity/presentation/middlewares/authenticate.middleware';

export interface OrganizationRoutesDeps {
  organizationsController: OrganizationsController;
  authMiddlewareDeps: AuthMiddlewareDeps;
}

/**
 * Registers all Organizations API routes onto the Fastify instance.
 *
 * All routes are protected by the JWT auth middleware. The controller handles
 * its own 401 guard as a safety net, but the preHandler fires first.
 *
 * Routes:
 *   POST   /api/v1/organizations                    — Create organization
 *   PATCH  /api/v1/organizations/:id                — Update organization
 *   POST   /api/v1/organizations/members/invite      — Invite user to org
 *   POST   /api/v1/organizations/:id/roles/assign    — Assign role to membership
 *   GET    /api/v1/organizations/:id/members         — List org members
 */
export async function registerOrganizationRoutes(
  fastify: FastifyInstance,
  deps: OrganizationRoutesDeps,
): Promise<void> {
  const authenticate = createAuthMiddleware(deps.authMiddlewareDeps);

  fastify.post(
    '/api/v1/organizations',
    {
      preHandler: [authenticate],
      schema: { tags: ['Organizations'], summary: 'Create a new organization' },
    },
    (req, reply) => deps.organizationsController.create(req, reply),
  );

  fastify.patch(
    '/api/v1/organizations/:id',
    {
      preHandler: [authenticate],
      schema: { tags: ['Organizations'], summary: 'Update an organization' },
    },
    (req, reply) => deps.organizationsController.update(req as never, reply),
  );

  fastify.post(
    '/api/v1/organizations/members/invite',
    {
      preHandler: [authenticate],
      schema: { tags: ['Organizations'], summary: 'Invite a user to an organization' },
    },
    (req, reply) => deps.organizationsController.inviteUser(req, reply),
  );

  fastify.post(
    '/api/v1/organizations/:id/roles/assign',
    {
      preHandler: [authenticate],
      schema: { tags: ['Organizations'], summary: 'Assign a role to a membership' },
    },
    (req, reply) => deps.organizationsController.assignRole(req as never, reply),
  );

  fastify.get(
    '/api/v1/organizations/:id/members',
    {
      preHandler: [authenticate],
      schema: { tags: ['Organizations'], summary: 'List members of an organization' },
    },
    (req, reply) => deps.organizationsController.listMembers(req as never, reply),
  );

  fastify.get(
    '/api/v1/organizations/:id/dashboard-stats',
    {
      preHandler: [authenticate],
      schema: { tags: ['Organizations'], summary: 'Get real-time dashboard statistics for an organization' },
    },
    (req, reply) => deps.organizationsController.getDashboardStats(req as never, reply),
  );
}
