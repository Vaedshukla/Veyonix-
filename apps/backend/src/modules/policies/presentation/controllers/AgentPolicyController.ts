import { FastifyRequest, FastifyReply } from 'fastify';

export class AgentPolicyController {
  constructor(
    private readonly redisPolicyCache: any,
    private readonly compiledPolicyRepository: any
  ) {}

  async fetchPolicy(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const deviceId = request.deviceId;
    
    if (!deviceId) {
      reply.status(401).send({ error: 'Device not authenticated' });
      return;
    }

    // Attempt to fetch from cache first
    let policy = await this.redisPolicyCache.getCompiledPolicy(deviceId);
    
    if (!policy) {
      // Fallback to database
      policy = await this.compiledPolicyRepository.findByDeviceId(deviceId);
      if (policy) {
        await this.redisPolicyCache.setCompiledPolicy(deviceId, policy);
      }
    }

    if (!policy) {
      reply.status(404).send({ error: 'No policy compiled for this device yet' });
      return;
    }

    reply.status(200).send({ policy });
  }
}
