import type { FastifyRequest, FastifyReply } from 'fastify';

import { GetUserProfileHandler } from '../../application/queries/GetUserProfile.handler';
import { ok } from '@shared/response/envelope';
import { UnauthorizedError } from '@shared/errors/DomainError';

export class UsersController {
  private readonly getUserProfileHandler: GetUserProfileHandler;

  constructor(dependencies: {
    getUserProfileHandler: GetUserProfileHandler;
  }) {
    this.getUserProfileHandler = dependencies.getUserProfileHandler;
  }

  async getMe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) {
      throw new UnauthorizedError('Authentication required.');
    }

    const profile = await this.getUserProfileHandler.handle(user.id);
    
    // Enrich with sessionId from request token context
    profile.sessionId = user.sessionId;

    void reply.status(200).send(ok(profile));
  }
}
