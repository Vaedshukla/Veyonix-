import type { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyWebsocket from '@fastify/websocket';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';

import { env } from '@config/index';
import { securityConfig } from '@config/security';
import { swaggerConfig } from '@config/swagger';

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  // ── Security Headers (Helmet) ────────────────────────────────────────
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: securityConfig.helmet.contentSecurityPolicy
      ? {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            scriptSrc: ["'self'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: securityConfig.helmet.crossOriginEmbedderPolicy,
  });

  // ── CORS ─────────────────────────────────────────────────────────────
  await app.register(fastifyCors, {
    origin: (origin, callback) => {
      if (!origin) {
        // Allow server-to-server requests
        callback(null, true);
        return;
      }
      if (securityConfig.cors.origins.includes(origin)) {
        callback(null, true);
      } else if (env.NODE_ENV === 'development') {
        callback(null, true); // Permissive in dev
      } else {
        callback(new Error('CORS policy: origin not allowed'), false);
      }
    },
    credentials: securityConfig.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  });

  // ── Global Rate Limiting ─────────────────────────────────────────────
  await app.register(fastifyRateLimit, {
    max: securityConfig.rateLimit.global.max,
    timeWindow: securityConfig.rateLimit.global.timeWindow,
    keyGenerator: (request) =>
      (request.headers['x-forwarded-for'] as string | undefined) ??
      request.ip ??
      'unknown',
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Retry after ${String(context.after)}.`,
      },
    }),
  });

  // ── WebSocket Support ────────────────────────────────────────────────
  await app.register(fastifyWebsocket, {
    options: {
      maxPayload: 1048576, // 1MB
    },
  });

  // ── Cookies ─────────────────────────────────────────────────────────
  await app.register(fastifyCookie, {
    secret: env.JWT_ACCESS_SECRET, // Used for signed cookies if needed
  });

  // ── File Uploads ─────────────────────────────────────────────────────
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max
      files: 10,
    },
  });

  // ── OpenAPI / Swagger ────────────────────────────────────────────────
  if (env.SWAGGER_ENABLED) {
    await app.register(fastifySwagger, swaggerConfig);
    await app.register(fastifySwaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
        displayRequestDuration: true,
        persistAuthorization: true,
      },
      staticCSP: true,
    });
  }
}
