import type { FastifyRequest, FastifyReply } from 'fastify';

import { LogTelemetryHandler } from '../../application/commands/LogTelemetry.handler';
import { logTelemetrySchema } from '../../application/commands/LogTelemetry.command';
import { AnalyticsRepository } from '../../domain/repositories/analytics.repository';
import { ok, noContent } from '@shared/response/envelope';
import { UnauthorizedError } from '@shared/errors/DomainError';

export class AnalyticsController {
  private readonly logTelemetryHandler: LogTelemetryHandler;
  private readonly analyticsRepository: AnalyticsRepository;

  constructor(dependencies: {
    logTelemetryHandler: LogTelemetryHandler;
    analyticsRepository: AnalyticsRepository;
  }) {
    this.logTelemetryHandler = dependencies.logTelemetryHandler;
    this.analyticsRepository = dependencies.analyticsRepository;
  }

  async log(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const device = request.device;
    if (!device) {
      throw new UnauthorizedError('Agent authentication required.');
    }

    const command = logTelemetrySchema.parse(request.body);
    await this.logTelemetryHandler.handle(device.id, device.organizationId, command);

    void reply.status(204).send(noContent());
  }

  async getDeviceActivity(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { deviceId } = request.params as { deviceId: string };
    const limit = (request.query as { limit?: number }).limit ?? 50;

    const visits = await this.analyticsRepository.listWebsiteVisits(deviceId, limit);
    const usages = await this.analyticsRepository.listApplicationUsages(deviceId, limit);

    void reply.status(200).send(ok({
      visits,
      usages,
    }));
  }
}
