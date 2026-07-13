import type { FastifyRequest, FastifyReply } from 'fastify';

import { CreateSchoolHandler } from '../../application/commands/CreateSchool.handler';
import { createSchoolSchema } from '../../application/commands/CreateSchool.command';
import { ok } from '@shared/response/envelope';
import { ForbiddenError } from '@shared/errors/DomainError';

export class OrganizationsController {
  private readonly createSchoolHandler: CreateSchoolHandler;

  constructor(dependencies: {
    createSchoolHandler: CreateSchoolHandler;
  }) {
    this.createSchoolHandler = dependencies.createSchoolHandler;
  }

  async createSchool(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { orgId } = request.params as { orgId: string };
    const body = createSchoolSchema.omit({ organizationId: true }).parse(request.body);

    const school = await this.createSchoolHandler.handle({
      ...body,
      organizationId: orgId,
    });

    void reply.status(201).send(ok(school));
  }
}
