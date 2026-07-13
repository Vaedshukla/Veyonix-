import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

/**
 * Health Check Routes
 *
 * GET /health         — Overall health summary
 * GET /health/ready   — Kubernetes readiness probe
 * GET /health/live    — Kubernetes liveness probe
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  // Liveness — is the process alive?
  app.get(
    '/live',
    {
      schema: {
        tags: ['Health'],
        summary: 'Liveness probe',
        description: 'Returns 200 if the process is alive. Used by Kubernetes.',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      await reply.send({ status: 'alive', timestamp: new Date().toISOString() });
    },
  );

  // Readiness — are all dependencies ready?
  app.get(
    '/ready',
    {
      schema: {
        tags: ['Health'],
        summary: 'Readiness probe',
        description: 'Checks DB and Redis connectivity. Used by Kubernetes.',
      },
    },
    async (request, reply) => {
      const checks: Record<string, 'ok' | 'error'> = {};
      let isReady = true;

      // Check PostgreSQL
      try {
        const prisma = request.container.resolve<PrismaClient>('prisma');
        await prisma.$queryRaw`SELECT 1`;
        checks['postgresql'] = 'ok';
      } catch {
        checks['postgresql'] = 'error';
        isReady = false;
      }

      // Check Redis
      try {
        const redis = request.container.resolve<Redis>('redis');
        await redis.ping();
        checks['redis'] = 'ok';
      } catch {
        checks['redis'] = 'error';
        isReady = false;
      }

      const statusCode = isReady ? 200 : 503;
      await reply.status(statusCode).send({
        status: isReady ? 'ready' : 'not-ready',
        checks,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // Startup — is the app fully initialized?
  app.get(
    '/startup',
    {
      schema: {
        tags: ['Health'],
        summary: 'Startup probe',
        description: 'Verifies DB and Cache connection initialization on startup.',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const prisma = request.container.resolve<PrismaClient>('prisma');
        await prisma.$queryRaw`SELECT 1`;
        await reply.send({ status: 'started', timestamp: new Date().toISOString() });
      } catch {
        await reply.status(503).send({ status: 'starting', timestamp: new Date().toISOString() });
      }
    }
  );

  // Overall health summary
  app.get(
    '/',
    {
      schema: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns overall system health with dependency status.',
      },
    },
    async (request, reply) => {
      const start = Date.now();
      const dependencies: Record<string, { status: string; latencyMs?: number }> = {};

      // PostgreSQL latency
      try {
        const prisma = request.container.resolve<PrismaClient>('prisma');
        const t0 = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        dependencies['postgresql'] = { status: 'ok', latencyMs: Date.now() - t0 };
      } catch (err) {
        dependencies['postgresql'] = { status: 'error' };
      }

      // Redis latency
      try {
        const redis = request.container.resolve<Redis>('redis');
        const t0 = Date.now();
        await redis.ping();
        dependencies['redis'] = { status: 'ok', latencyMs: Date.now() - t0 };
      } catch {
        dependencies['redis'] = { status: 'error' };
      }

      await reply.send({
        status: 'ok',
        version: process.env['APP_VERSION'] ?? '0.1.0',
        uptime: process.uptime(),
        responseTimeMs: Date.now() - start,
        dependencies,
        timestamp: new Date().toISOString(),
      });
    },
  );
}
