import type { FastifyInstance } from 'fastify';
import { env } from '@config/index';

export async function systemRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/',
    {
      schema: {
        tags: ['System'],
        summary: 'System info',
        description: 'Returns basic system and version information.',
      },
    },
    async (_request, reply) => {
      await reply.send({
        success: true,
        data: {
          name: env.APP_NAME,
          version: env.APP_VERSION,
          environment: env.NODE_ENV,
          nodeVersion: process.version,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
      });
    },
  );
}
