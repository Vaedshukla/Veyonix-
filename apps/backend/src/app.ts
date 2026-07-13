/**
 * Veyonix Backend — Fastify Application Factory
 *
 * Registers all plugins, routes, and lifecycle hooks.
 * Returns a fully configured Fastify instance.
 */
import fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

import { env } from '@config/index';
import { loggerConfig } from '@config/logger';
import { registerPlugins } from './bootstrap/plugins';
import { registerRoutes } from './bootstrap/routes';
import { registerContainer } from './bootstrap/container';
import { errorHandler } from './presentation/error-handler';
import { correlationMiddleware } from '@shared/guards/correlation.middleware';

export async function createApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: loggerConfig,
    disableRequestLogging: false,
    trustProxy: true, // Trust X-Forwarded-* headers (for nginx/load balancers)
    ajv: {
      customOptions: {
        removeAdditional: 'all', // Strip unknown fields
        coerceTypes: 'array',
        useDefaults: true,
      },
    },
    genReqId: () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { uuidv7 } = require('uuidv7') as { uuidv7: () => string };
      return uuidv7();
    },
  });

  // Decorate request with typed user context
  app.decorateRequest('user', null);
  app.decorateRequest('deviceId', null);

  // 1. Register DI container first
  await registerContainer(app);

  // Global tracing / correlation ID hook
  app.addHook('onRequest', correlationMiddleware);

  // 2. Register all Fastify plugins
  await registerPlugins(app);

  // 3. Register all routes
  await registerRoutes(app);

  // 4. Set global error handler
  app.setErrorHandler(errorHandler);

  // 5. Graceful shutdown hooks
  app.addHook('onClose', async () => {
    app.log.info('Closing application resources...');
  });

  // 6. Request logging hook
  app.addHook('onResponse', (request, reply, done) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
        requestId: request.id,
        userAgent: request.headers['user-agent'],
      },
      'Request completed',
    );
    done();
  });

  return app;
}
