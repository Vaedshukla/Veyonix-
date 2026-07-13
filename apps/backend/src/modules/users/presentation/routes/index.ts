import type { FastifyInstance } from 'fastify';

import { UsersController } from '../controllers/users.controller';
import { authenticate } from '@shared/guards/auth.middleware';

export async function userRoutes(app: FastifyInstance): Promise<void> {
  const controller = app.container.resolve<UsersController>('usersController');

  // All user routes are authenticated
  app.addHook('preHandler', authenticate);

  // ── Get Authenticated User Profile ──────────────────────────────────
  app.get('/me', {
    schema: {
      tags: ['Users'],
      summary: 'Get current user profile',
      description: 'Returns profile details for the authenticated user.',
      security: [{ BearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string' },
                fullName: { type: 'string' },
                role: { type: 'string' },
                organizationId: { type: 'string', format: 'uuid' },
                organizationName: { type: 'string' },
                sessionId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
    },
  }, controller.getMe.bind(controller));
}
