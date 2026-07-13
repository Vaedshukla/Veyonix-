import type { FastifyRequest, FastifyReply } from 'fastify';

import { IssueCommandHandler } from '../../application/commands/IssueCommand.handler';
import { issueCommandSchema } from '../../application/commands/IssueCommand.command';
import { DevicesRepository } from '../../domain/repositories/devices.repository';
import { ok } from '@shared/response/envelope';
import { UnauthorizedError } from '@shared/errors/DomainError';

export class DevicesController {
  private readonly issueCommandHandler: IssueCommandHandler;
  private readonly devicesRepository: DevicesRepository;

  constructor(dependencies: {
    issueCommandHandler: IssueCommandHandler;
    devicesRepository: DevicesRepository;
  }) {
    this.issueCommandHandler = dependencies.issueCommandHandler;
    this.devicesRepository = dependencies.devicesRepository;
  }

  async issue(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) throw new UnauthorizedError('Authentication required.');

    const body = issueCommandSchema.parse(request.body);
    const result = await this.issueCommandHandler.handle(body, user.id);

    void reply.status(201).send(ok(result));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) throw new UnauthorizedError('Authentication required.');

    const devices = await this.devicesRepository.listByOrganization(user.organizationId);

    void reply.status(200).send(ok(devices));
  }
}
