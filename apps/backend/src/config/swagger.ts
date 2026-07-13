/**
 * Veyonix Backend — Swagger / OpenAPI Configuration
 */
import type { FastifyDynamicSwaggerOptions } from '@fastify/swagger';
import { env } from './index';

export const swaggerConfig: FastifyDynamicSwaggerOptions = {
  openapi: {
    openapi: '3.1.0',
    info: {
      title: 'Veyonix API',
      description: `
## Veyonix — AI-powered Digital Wellbeing Platform API

This API powers the Veyonix backend for managing organizations, devices, policies, and AI-driven insights.

### Authentication
All API endpoints (except \`/health\`, \`/metrics\`, and \`/api/v1/auth/*\`) require a valid JWT Bearer token.

\`\`\`
Authorization: Bearer <access_token>
\`\`\`

### Rate Limiting
- **Global**: 100 requests / 60s per IP
- **Auth endpoints**: 10 requests / 60s per IP

### Error Format (RFC 7807)
All errors follow the Problem Details format:
\`\`\`json
{
  "type": "https://veyonix.com/errors/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Device with id xyz was not found",
  "instance": "/api/v1/devices/xyz",
  "requestId": "01906..."
}
\`\`\`
      `.trim(),
      version: env.APP_VERSION,
      contact: {
        name: 'Veyonix Engineering',
        email: 'engineering@veyonix.com',
      },
      license: {
        name: 'Proprietary',
        url: 'https://veyonix.com',
      },
    },
    servers: [
      {
        url: `${env.APP_BASE_URL}/api/v1`,
        description:
          env.NODE_ENV === 'production' ? 'Production' : 'Development',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Health', description: 'Health & readiness probes' },
      { name: 'System', description: 'System information and metrics' },
      { name: 'Auth', description: 'Authentication & token management' },
      { name: 'Users', description: 'User management' },
      { name: 'Organizations', description: 'Organization management' },
      { name: 'Devices', description: 'Device enrollment and management' },
      { name: 'Policies', description: 'Policy engine' },
      { name: 'Agent', description: 'AI agent & conversations' },
      { name: 'Analytics', description: 'Usage analytics & reports' },
      { name: 'Notifications', description: 'Notification management' },
    ],
  },
};
