import type { FastifyRequest, FastifyReply } from 'fastify';

import { CreateReportHandler } from '../../application/commands/CreateReport.handler';
import { createReportSchema } from '../../application/commands/CreateReport.command';
import { ReportsRepository } from '../../domain/repositories/reports.repository';
import { ok } from '@shared/response/envelope';
import { UnauthorizedError, NotFoundError } from '@shared/errors/DomainError';

export class ReportsController {
  private readonly createReportHandler: CreateReportHandler;
  private readonly reportsRepository: ReportsRepository;

  constructor(dependencies: {
    createReportHandler: CreateReportHandler;
    reportsRepository: ReportsRepository;
  }) {
    this.createReportHandler = dependencies.createReportHandler;
    this.reportsRepository = dependencies.reportsRepository;
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) throw new UnauthorizedError('Authentication required.');

    const body = createReportSchema.parse(request.body);
    const result = await this.createReportHandler.handle(body, user.organizationId, user.id);

    void reply.status(201).send(ok(result));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) throw new UnauthorizedError('Authentication required.');

    const reports = await this.reportsRepository.listByOrganization(user.organizationId);

    void reply.status(200).send(ok(reports));
  }

  async get(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) throw new UnauthorizedError('Authentication required.');

    const { reportId } = request.params as { reportId: string };
    const report = await this.reportsRepository.findById(reportId);

    if (!report || report.organizationId !== user.organizationId) {
      throw new NotFoundError(`Report '${reportId}' not found.`);
    }

    void reply.status(200).send(ok(report));
  }
}
