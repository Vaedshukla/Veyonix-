import type { FastifyRequest, FastifyReply } from 'fastify';

import { EnrollAgentHandler } from '../../application/commands/EnrollAgent.handler';
import { ProcessHeartbeatHandler } from '../../application/commands/ProcessHeartbeat.handler';
import { enrollAgentSchema } from '../../application/commands/EnrollAgent.command';
import { processHeartbeatSchema } from '../../application/commands/ProcessHeartbeat.command';
import { ok } from '@shared/response/envelope';
import { UnauthorizedError } from '@shared/errors/DomainError';

export class AgentController {
  private readonly enrollAgentHandler: EnrollAgentHandler;
  private readonly processHeartbeatHandler: ProcessHeartbeatHandler;

  constructor(dependencies: {
    enrollAgentHandler: EnrollAgentHandler;
    processHeartbeatHandler: ProcessHeartbeatHandler;
  }) {
    this.enrollAgentHandler = dependencies.enrollAgentHandler;
    this.processHeartbeatHandler = dependencies.processHeartbeatHandler;
  }

  async enroll(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const command = enrollAgentSchema.parse(request.body);
    const result = await this.enrollAgentHandler.handle(command);
    void reply.status(201).send(ok(result));
  }

  async heartbeat(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const device = request.device;
    if (!device) {
      throw new UnauthorizedError('Agent authentication required.');
    }

    const command = processHeartbeatSchema.parse(request.body);
    const result = await this.processHeartbeatHandler.handle(device.id, command);
    void reply.status(200).send(ok(result));
  }
}
