import type { FastifyInstance } from 'fastify';
import { register, collectDefaultMetrics } from 'prom-client';

// Collect Node.js default metrics (CPU, memory, GC, etc.)
collectDefaultMetrics({ prefix: 'veyonix_' });

/**
 * Prometheus Metrics endpoint.
 * Protected in production — only accessible from internal networks.
 */
export async function metricsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/',
    {
      schema: {
        tags: ['System'],
        summary: 'Prometheus metrics',
        description: 'Exposes Prometheus-compatible metrics for scraping.',
        produces: ['text/plain'],
      },
    },
    async (_request, reply) => {
      const metrics = await register.metrics();
      await reply
        .type('text/plain; version=0.0.4; charset=utf-8')
        .send(metrics);
    },
  );
}
