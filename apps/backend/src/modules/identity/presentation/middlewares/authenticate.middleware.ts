import type { FastifyRequest, FastifyReply } from 'fastify';
import type { JwtTokenService } from '../../infrastructure/services/JwtTokenService';
import type { RedisSessionCache } from '../../infrastructure/services/RedisSessionCache';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';

export interface AuthMiddlewareDeps {
  tokenService: JwtTokenService;
  sessionCache: RedisSessionCache;
  userRepository: IUserRepository;
}

/**
 * Fastify preHandler hook that validates the JWT Bearer token.
 *
 * Flow:
 * 1. Extract Bearer token from Authorization header.
 * 2. Verify JWT signature and expiry.
 * 3. Check session is still valid in Redis (provides instant revocation).
 * 4. Attach decoded payload to request.user.
 *
 * If any step fails, reply with 401 Unauthorized.
 */
export function createAuthMiddleware(deps: AuthMiddlewareDeps) {
  return async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or malformed Authorization header.',
        },
      });
    }

    const token = authHeader.slice(7);

    let payload: ReturnType<JwtTokenService['verifyAccessToken']>;
    try {
      payload = deps.tokenService.verifyAccessToken(token);
    } catch {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'The access token is invalid or has expired.',
        },
      });
    }

    // Session check — O(1) Redis lookup ensures instant revocation works
    const isValid = await deps.sessionCache.isSessionValid(payload.sessionId);
    if (!isValid) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'AUTH_SESSION_EXPIRED',
          message: 'Your session has expired or been revoked. Please log in again.',
        },
      });
    }

    // Attach decoded user to request
    request.user = {
      id: payload.sub,
      email: payload.email,
      fullName: '',
      role: payload.role as never,
      organizationId: payload.orgId,
      sessionId: payload.sessionId,
    };
  };
}
