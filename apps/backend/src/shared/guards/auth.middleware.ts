import type { FastifyRequest, FastifyReply } from 'fastify';

import { UnauthorizedError } from '@shared/errors/DomainError';
import type { TokenProvider } from '../../modules/auth/infrastructure/jwt/jwt.adapter';
import type { AuthRepository } from '../../modules/auth/domain/repositories/auth.repository';

/**
 * Authentication Middleware / preHandler hook.
 * Verifies JWT access token in the Authorization header.
 * Populates request.user with authenticated user context.
 */
export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication required. Missing Bearer token.');
  }

  const token = authHeader.substring(7); // Remove 'Bearer '
  
  try {
    const tokenProvider = request.container.resolve<TokenProvider>('tokenProvider');
    const authRepository = request.container.resolve<AuthRepository>('authRepository');

    // 1. Decode and verify token signature
    const payload = tokenProvider.verifyAccess(token);

    // 2. Validate Session Lifecycle (Revocation Check)
    const session = await authRepository.findSession(payload.sessionId);
    if (!session || session.revokedAt !== null || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedError('Session has been revoked or expired.');
    }

    // 3. Populate user context
    request.user = {
      id: payload.sub,
      email: payload.email,
      fullName: payload.email, // placeholder resolved in user details route
      role: payload.role,
      organizationId: payload.orgId,
      sessionId: payload.sessionId,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Invalid or expired authentication token.', undefined);
  }
}
