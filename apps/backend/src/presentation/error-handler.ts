import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodError } from 'zod';

import { AppError } from '@shared/errors/AppError';
import { env } from '@config/index';

/**
 * Global Fastify Error Handler
 *
 * Converts all errors to RFC 7807 Problem Details format.
 * Distinguishes between:
 * - AppError (operational): domain/business errors, safe to expose
 * - ZodError: validation failures
 * - Fastify native errors (404, method not allowed, etc.)
 * - Unknown errors: generic 500, details hidden in production
 */
export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const requestId = request.id;
  const baseUrl = 'https://veyonix.com/errors';

  // ── Operational AppError ───────────────────────────────────────────
  if (error instanceof AppError) {
    request.log.warn(
      { err: error, requestId },
      `[${error.code}] ${error.message}`,
    );
    void reply.status(error.statusCode).send({
      type: `${baseUrl}/${error.code.toLowerCase().replace(/_/g, '-')}`,
      title: error.name,
      status: error.statusCode,
      detail: error.message,
      instance: request.url,
      errors: error.details,
      requestId,
    });
    return;
  }

  // ── Zod Validation Error ──────────────────────────────────────────
  if (isZodError(error)) {
    const details = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    void reply.status(422).send({
      type: `${baseUrl}/validation-error`,
      title: 'Validation Error',
      status: 422,
      detail: 'One or more fields failed validation.',
      instance: request.url,
      errors: details,
      requestId,
    });
    return;
  }

  // ── Fastify native errors (404, 405, etc.) ───────────────────────
  const fastifyError = error as FastifyError;
  if (fastifyError.statusCode && fastifyError.statusCode < 500) {
    void reply.status(fastifyError.statusCode).send({
      type: `${baseUrl}/request-error`,
      title: 'Request Error',
      status: fastifyError.statusCode,
      detail: error.message,
      instance: request.url,
      requestId,
    });
    return;
  }

  // ── Unexpected errors (500) ──────────────────────────────────────
  request.log.error(
    { err: error, requestId, stack: error.stack },
    'Unhandled error',
  );
  void reply.status(500).send({
    type: `${baseUrl}/internal-server-error`,
    title: 'Internal Server Error',
    status: 500,
    detail:
      env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Our team has been notified.'
        : error.message,
    instance: request.url,
    requestId,
    ...(env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
}

function isZodError(error: unknown): error is ZodError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'issues' in error &&
    Array.isArray((error as ZodError).issues)
  );
}
