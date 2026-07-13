import type { FastifyRequest, FastifyReply } from 'fastify';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import type { IRoleRepository } from '../../domain/repositories/IRoleRepository';

export interface UsersControllerDeps {
  userRepository: IUserRepository;
  roleRepository: IRoleRepository;
}

export class IdentityUsersController {
  constructor(private readonly deps: UsersControllerDeps) {}

  async getMe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
    }

    const user = await this.deps.userRepository.findById(request.user.id);
    if (!user) {
      return reply.status(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found.' } });
    }

    const permissions = await this.deps.roleRepository.getPermissionsForUser(user.id);

    reply.status(200).send({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        permissions,
      },
    });
  }

  async getSessions(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // Returns list of active sessions for the authenticated user
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
    }
    reply.status(200).send({ success: true, data: { sessions: [], message: 'Session listing will be implemented in a future update.' } });
  }
}
