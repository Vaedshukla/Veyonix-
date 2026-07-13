import type { FastifyInstance } from 'fastify';

import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '@shared/guards/auth.middleware';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Resolve AuthController via Awilix container
  const controller = app.container.resolve<AuthController>('authController');

  // ── Register New Tenant & User ───────────────────────────────────────
  app.post('/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Register a new tenant & user account',
      description: 'Creates a new tenant organization and super admin user.',
      body: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName', 'organizationName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          organizationName: { type: 'string' },
          organizationType: { 
            type: 'string', 
            enum: ['SCHOOL_DISTRICT', 'SCHOOL', 'FAMILY', 'ENTERPRISE'],
            default: 'FAMILY' 
          },
          role: { 
            type: 'string', 
            enum: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PARENT', 'SUPPORT'],
            default: 'PARENT' 
          },
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
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    email: { type: 'string' },
                    fullName: { type: 'string' },
                    role: { type: 'string' },
                    organizationId: { type: 'string', format: 'uuid' },
                    sessionId: { type: 'string', format: 'uuid' },
                  },
                },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, controller.register.bind(controller));

  // ── Login User ───────────────────────────────────────────────────────
  app.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Authenticate credentials and start session',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
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
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    email: { type: 'string' },
                    fullName: { type: 'string' },
                    role: { type: 'string' },
                    organizationId: { type: 'string', format: 'uuid' },
                    sessionId: { type: 'string', format: 'uuid' },
                  },
                },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, controller.login.bind(controller));

  // ── Refresh Tokens (Token Rotation) ──────────────────────────────────
  app.post('/refresh', {
    schema: {
      tags: ['Auth'],
      summary: 'Rotate credentials using refresh token',
      description: 'Exchange refresh token for a new set of credentials.',
      body: {
        type: 'object',
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
  }, controller.refresh.bind(controller));

  // ── Logout User (Session Revocation) ─────────────────────────────────
  app.post('/logout', {
    preHandler: [authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Revoke session and clean cookies',
      security: [{ BearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'null' },
          },
        },
      },
    },
  }, controller.logout.bind(controller));
}
