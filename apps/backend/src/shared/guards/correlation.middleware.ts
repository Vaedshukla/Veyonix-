import type { FastifyRequest, FastifyReply } from 'fastify';
import * as crypto from 'crypto';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId?: string;
  }
}

/**
 * Tracing Correlation ID propagation middleware.
 * Ensures every incoming HTTP request carries a tracing identifier that gets bound
 * to background jobs, socket payloads, and structured logging context.
 */
export async function correlationMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const correlationId = (request.headers['x-correlation-id'] as string) || crypto.randomUUID();
  
  // Attach correlation ID to request context
  request.correlationId = correlationId;
  
  // Attach to response headers
  void reply.header('x-correlation-id', correlationId);

  // Bind to Pino logger context
  request.log = request.log.child({ correlationId });
}
