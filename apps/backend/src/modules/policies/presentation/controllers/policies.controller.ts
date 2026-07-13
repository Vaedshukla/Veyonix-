import type { FastifyRequest, FastifyReply } from 'fastify';

import { CreatePolicyHandler } from '../../application/commands/CreatePolicy.handler';
import { CreatePolicyVersionHandler } from '../../application/commands/CreatePolicyVersion.handler';
import { createPolicySchema } from '../../application/commands/CreatePolicy.command';
import { createPolicyVersionSchema } from '../../application/commands/CreatePolicyVersion.command';
import { PoliciesRepository } from '../../domain/repositories/policies.repository';
import { ok } from '@shared/response/envelope';
import { UnauthorizedError } from '@shared/errors/DomainError';

export class PoliciesController {
  private readonly createPolicyHandler: CreatePolicyHandler;
  private readonly createPolicyVersionHandler: CreatePolicyVersionHandler;
  private readonly policiesRepository: PoliciesRepository;

  constructor(dependencies: {
    createPolicyHandler: CreatePolicyHandler;
    createPolicyVersionHandler: CreatePolicyVersionHandler;
    policiesRepository: PoliciesRepository;
  }) {
    this.createPolicyHandler = dependencies.createPolicyHandler;
    this.createPolicyVersionHandler = dependencies.createPolicyVersionHandler;
    this.policiesRepository = dependencies.policiesRepository;
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) throw new UnauthorizedError('Authentication required.');

    const body = createPolicySchema.parse(request.body);
    const policy = await this.createPolicyHandler.handle(body, user.organizationId, user.id);

    void reply.status(201).send(ok(policy));
  }

  async createVersion(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) throw new UnauthorizedError('Authentication required.');

    const { policyId } = request.params as { policyId: string };
    const body = createPolicyVersionSchema.parse(request.body);

    const version = await this.createPolicyVersionHandler.handle(policyId, body, user.id);

    void reply.status(201).send(ok(version));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) throw new UnauthorizedError('Authentication required.');

    const policies = await this.policiesRepository.listPolicies(user.organizationId);

    void reply.status(200).send(ok(policies));
  }
}
