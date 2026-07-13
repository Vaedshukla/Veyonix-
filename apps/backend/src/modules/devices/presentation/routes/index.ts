import type { FastifyInstance } from 'fastify';

import { DevicesController } from '../controllers/devices.controller';
import { authenticate } from '@shared/guards/auth.middleware';
import { requireRoles } from '@shared/guards/roles.guard';
import { UserRole } from '@veyonix/shared-types';

export async function deviceRoutes(app: FastifyInstance): Promise<void> {
  const controller = app.container.resolve<DevicesController>('devicesController');

  // Protect all device routes
  app.addHook('preHandler', authenticate);

  // ── List Devices (Dashboard Endpoint) ───────────────────────────────
  app.get('/', {
    preHandler: [requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PARENT)],
    schema: {
      tags: ['Devices'],
      summary: 'List all devices in organization',
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
                  macAddress: { type: 'string' },
                  hostname: { type: 'string' },
                  name: { type: 'string' },
                  platform: { type: 'string' },
                  status: { type: 'string' },
                  isManaged: { type: 'boolean' },
                  lastSeenAt: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
      },
    },
  }, controller.list.bind(controller));

  // ── Issue Command (Dashboard Action Endpoint) ────────────────────────
  app.post('/commands', {
    preHandler: [requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PARENT)],
    schema: {
      tags: ['Devices'],
      summary: 'Issue a command to a device',
      security: [{ BearerAuth: [] }],
      body: {
        type: 'object',
        required: ['deviceId', 'type'],
        properties: {
          deviceId: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['LOCK', 'UNLOCK', 'SYNC_POLICY', 'SCREENSHOT', 'RESTART', 'SHUTDOWN', 'ENABLE_FOCUS_MODE', 'DISABLE_FOCUS_MODE', 'BLOCK_INTERNET', 'UNBLOCK_INTERNET', 'UPDATE_AGENT'] },
          payload: { type: 'object' },
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
                deviceId: { type: 'string', format: 'uuid' },
                type: { type: 'string' },
                status: { type: 'string' },
                expiresAt: { type: 'string' },
                sentAt: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
    },
  }, controller.issue.bind(controller));
}
