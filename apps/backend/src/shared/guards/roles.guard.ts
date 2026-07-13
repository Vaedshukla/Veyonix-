import type { FastifyReply, FastifyRequest } from 'fastify';

import { ForbiddenError } from '@shared/errors/DomainError';
import type { UserRole } from '@veyonix/shared-types';

/**
 * RBAC guard factory.
 * Returns a Fastify preHandler that checks req.user.role.
 *
 * Usage:
 *   fastify.get('/admin', { preHandler: requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN') }, handler)
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return async function rolesGuard(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const user = request.user;

    if (!user) {
      throw new ForbiddenError('Authentication required.');
    }

    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new ForbiddenError(
        `This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
      );
    }
  };
}

/**
 * Guard that checks the user can only access their own organization's resources.
 * Allows SUPER_ADMIN to bypass this restriction.
 */
export function requireSameOrg() {
  return async function orgGuard(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const user = request.user;
    if (!user) throw new ForbiddenError('Authentication required.');

    const { orgId } = request.params as { orgId?: string };
    if (
      orgId &&
      user.organizationId !== orgId &&
      user.role !== ('SUPER_ADMIN' as UserRole)
    ) {
      throw new ForbiddenError(
        'You do not have permission to access this organization.',
      );
    }
  };
}
