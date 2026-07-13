import type { FastifyInstance } from 'fastify';

import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate } from '@shared/guards/auth.middleware';
import { authenticateAgent } from '@shared/guards/agent.middleware';
import { requireRoles } from '@shared/guards/roles.guard';
import { UserRole } from '@veyonix/shared-types';

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  const controller = app.container.resolve<AnalyticsController>('analyticsController');

  // ── Log Telemetry (Desktop Agent Ingestion Endpoint) ────────────────
  app.post('/telemetry', {
    preHandler: [authenticateAgent],
    schema: {
      tags: ['Analytics'],
      summary: 'Upload website and app usage telemetry',
      security: [{ AgentAuth: [] }],
      body: {
        type: 'object',
        properties: {
          visits: {
            type: 'array',
            items: {
              type: 'object',
              required: ['url', 'domain', 'action', 'visitedAt'],
              properties: {
                url: { type: 'string', format: 'uri' },
                domain: { type: 'string' },
                title: { type: 'string' },
                category: { type: 'string' },
                durationMs: { type: 'number' },
                action: { type: 'string', enum: ['ALLOW', 'BLOCK', 'WARN', 'LOG', 'REDIRECT'] },
                visitedAt: { type: 'string' },
              },
            },
          },
          appUsages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['appName', 'processName', 'action', 'usedAt'],
              properties: {
                appName: { type: 'string' },
                processName: { type: 'string' },
                category: { type: 'string' },
                durationMs: { type: 'number' },
                action: { type: 'string', enum: ['ALLOW', 'BLOCK', 'WARN', 'LOG', 'REDIRECT'] },
                usedAt: { type: 'string' },
              },
            },
          },
        },
      },
      response: {
        204: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, controller.log.bind(controller));

  // ── Get Device Activity (Dashboard Analytics Query Endpoint) ─────────
  app.get('/devices/:deviceId/activity', {
    preHandler: [
      authenticate,
      requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PARENT)
    ],
    schema: {
      tags: ['Analytics'],
      summary: 'Get website visits and app usage telemetry charts for device',
      security: [{ BearerAuth: [] }],
      params: {
        type: 'object',
        required: ['deviceId'],
        properties: {
          deviceId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                visits: { type: 'array' },
                usages: { type: 'array' },
              },
            },
          },
        },
      },
    },
  }, controller.getDeviceActivity.bind(controller));
}
