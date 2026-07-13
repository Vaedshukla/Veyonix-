import type { FastifyInstance } from 'fastify';

import { OrganizationsController } from '../controllers/organizations.controller';
import { authenticate } from '@shared/guards/auth.middleware';
import { requireRoles, requireSameOrg } from '@shared/guards/roles.guard';
import { UserRole } from '@veyonix/shared-types';

export async function organizationRoutes(app: FastifyInstance): Promise<void> {
  const controller = app.container.resolve<OrganizationsController>('organizationsController');

  // ── Create School (Protected & RBAC & Multi-tenant safe) ────────────
  app.post('/:orgId/schools', {
    preHandler: [
      authenticate,
      requireSameOrg(),
      requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
    ],
    schema: {
      tags: ['Organizations'],
      summary: 'Create a new school inside organization',
      security: [{ BearerAuth: [] }],
      params: {
        type: 'object',
        required: ['orgId'],
        properties: {
          orgId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          address: { type: 'string' },
          phone: { type: 'string' },
          principalName: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                organizationId: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                address: { type: 'string', nullable: true },
                phone: { type: 'string', nullable: true },
                principalName: { type: 'string', nullable: true },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, controller.createSchool.bind(controller));
}
