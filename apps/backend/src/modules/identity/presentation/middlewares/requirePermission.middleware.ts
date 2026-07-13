import type { FastifyRequest, FastifyReply } from 'fastify';
import type { IRoleRepository } from '../../domain/repositories/IRoleRepository';
import type { RedisSessionCache } from '../../infrastructure/services/RedisSessionCache';

export interface PermissionMiddlewareDeps {
  roleRepository: IRoleRepository;
  sessionCache: RedisSessionCache;
}

/**
 * RBAC middleware factory.
 *
 * Returns a Fastify preHandler that checks whether the authenticated user
 * has a specific permission key (e.g., 'users.write', 'devices.manage').
 *
 * Permissions are cached in Redis after the first load, keyed by userId.
 * Cache is invalidated whenever a Role is updated.
 *
 * Usage:
 *   fastify.delete('/users/:id', { preHandler: [authenticate, requirePermission('users.delete', deps)] }, handler)
 */
export function createRequirePermission(deps: PermissionMiddlewareDeps) {
  return function requirePermission(permissionKey: string) {
    return async function check(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication is required.' },
        });
      }

      const userId = request.user.id;

      // 1. Try Redis cache first
      let permissions = await deps.sessionCache.getPermissions(userId);

      // 2. Cache miss — load from DB
      if (!permissions) {
        permissions = await deps.roleRepository.getPermissionsForUser(userId);
        // Cache for 5 minutes
        await deps.sessionCache.cachePermissions(userId, permissions, 1, 300);
      }

      // 3. Check exact or wildcard match
      const hasPermission = permissions.some((key) => {
        if (key === permissionKey) return true;
        if (key.endsWith('.*')) {
          const prefix = key.slice(0, -2);
          return permissionKey.startsWith(`${prefix}.`);
        }
        return false;
      });

      if (!hasPermission) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: `You do not have the required permission: '${permissionKey}'.`,
          },
        });
      }
    };
  };
}
