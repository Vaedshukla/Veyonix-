import type { FastifyInstance } from 'fastify';

import { PoliciesController } from '../controllers/policies.controller';
import { authenticate } from '@shared/guards/auth.middleware';
import { requireRoles } from '@shared/guards/roles.guard';
import { UserRole } from '@veyonix/shared-types';

export async function policyRoutes(app: FastifyInstance): Promise<void> {
  const controller = app.container.resolve<PoliciesController>('policiesController');

  // Protect all policy routes
  app.addHook('preHandler', authenticate);

  // ── List Policies ───────────────────────────────────────────────────
  app.get('/', {
    preHandler: [requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PARENT)],
    schema: {
      tags: ['Policies'],
      summary: 'List all policies',
      security: [{ BearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  organizationId: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  type: { type: 'string' },
                  currentVersion: { type: 'number' },
                  isActive: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
  }, controller.list.bind(controller));

  // ── Create Policy ────────────────────────────────────────────────────
  app.post('/', {
    preHandler: [requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PARENT)],
    schema: {
      tags: ['Policies'],
      summary: 'Create a new policy',
      security: [{ BearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['WEB_FILTER', 'APP_FILTER', 'TIME_RESTRICTION', 'CONTENT_FILTER', 'NETWORK', 'FOCUS_MODE'] },
        },
      },
    },
  }, controller.create.bind(controller));

  // ── Create Policy Version (Update Rules) ─────────────────────────────
  app.post('/:policyId/versions', {
    preHandler: [requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PARENT)],
    schema: {
      tags: ['Policies'],
      summary: 'Create a new policy version',
      description: 'Rotates active version and pushes rules. Triggers sync events.',
      security: [{ BearerAuth: [] }],
      params: {
        type: 'object',
        required: ['policyId'],
        properties: {
          policyId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['ruleGroups'],
        properties: {
          changeNotes: { type: 'string' },
          ruleGroups: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'rules'],
              properties: {
                name: { type: 'string' },
                operator: { type: 'string' },
                rules: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['type', 'action', 'target'],
                    properties: {
                      type: { type: 'string' },
                      action: { type: 'string' },
                      target: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, controller.createVersion.bind(controller));
}
