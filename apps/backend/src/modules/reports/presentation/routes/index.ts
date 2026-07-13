import type { FastifyInstance } from 'fastify';

import { ReportsController } from '../controllers/reports.controller';
import { authenticate } from '@shared/guards/auth.middleware';
import { requireRoles } from '@shared/guards/roles.guard';
import { UserRole } from '@veyonix/shared-types';

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  const controller = app.container.resolve<ReportsController>('reportsController');

  // Protect all report routes
  app.addHook('preHandler', authenticate);

  // ── List Reports ────────────────────────────────────────────────────
  app.get('/', {
    preHandler: [requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PARENT)],
    schema: {
      tags: ['Reports'],
      summary: 'List all generated reports',
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
                  type: { type: 'string' },
                  status: { type: 'string' },
                  storagePath: { type: 'string', nullable: true },
                  generatedBy: { type: 'string', format: 'uuid' },
                  completedAt: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
      },
    },
  }, controller.list.bind(controller));

  // ── Trigger Async Report Generation ─────────────────────────────────
  app.post('/', {
    preHandler: [requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PARENT)],
    schema: {
      tags: ['Reports'],
      summary: 'Enqueue async report generation',
      security: [{ BearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['usage', 'compliance', 'activity', 'alert_summary'] },
          parameters: { type: 'object' },
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
                status: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, controller.create.bind(controller));

  // ── Get Report Status & Details ─────────────────────────────────────
  app.get('/:reportId', {
    preHandler: [requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PARENT)],
    schema: {
      tags: ['Reports'],
      summary: 'Get report generation status',
      security: [{ BearerAuth: [] }],
      params: {
        type: 'object',
        required: ['reportId'],
        properties: {
          reportId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, controller.get.bind(controller));
}
