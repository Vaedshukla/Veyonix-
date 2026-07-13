import { FastifyRequest, FastifyReply } from 'fastify';
import { IDeviceRepository } from '../../infrastructure/repositories/PrismaDeviceRepository';
import { IEnrollmentTokenRepository } from '../../infrastructure/repositories/PrismaEnrollmentTokenRepository';
import crypto from 'crypto';
import { DeviceStatus, EnrollmentStatus, EnrollmentMethod } from '@prisma/client';

export class AgentApiController {
  constructor(
    private readonly deviceRepository: IDeviceRepository,
    private readonly enrollmentTokenRepository: IEnrollmentTokenRepository,
    private readonly jwtTokenService: any
  ) {}

  async enroll(request: FastifyRequest, reply: FastifyReply) {
    const { tokenHash, hostname, os, architecture, agentVersion } = request.body as any;
    const token = await this.enrollmentTokenRepository.findByTokenHash(tokenHash);
    
    if (!token || token.uses >= token.maxUses || token.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'Invalid or expired enrollment token' });
    }

    const deviceSecret = crypto.randomBytes(32).toString('hex');
    const deviceSecretHash = crypto.createHash('sha256').update(deviceSecret).digest('hex');

    const device = await this.deviceRepository.create({
      id: crypto.randomUUID(),
      organizationId: token.organizationId,
      hostname,
      serialNumber: null,
      os,
      architecture,
      status: DeviceStatus.ACTIVE,
      publicKey: null,
      deviceSecretHash,
      agentVersion,
      enrollmentStatus: EnrollmentStatus.COMPLETED,
      enrollmentMethod: EnrollmentMethod.MANUAL,
      lastSeenAt: new Date()
    } as any);

    await this.enrollmentTokenRepository.update(token.id, { uses: token.uses + 1 });

    return reply.send({ deviceId: device.id, deviceSecret });
  }

  async auth(request: FastifyRequest, reply: FastifyReply) {
    const { deviceId, deviceSecret } = request.body as any;
    const device = await this.deviceRepository.findById(deviceId);
    
    if (!device) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const secretHash = crypto.createHash('sha256').update(deviceSecret).digest('hex');
    if (device.deviceSecretHash !== secretHash) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = await this.jwtTokenService.sign({ sub: device.id, type: 'device' });
    return reply.send({ token });
  }

  async heartbeat(request: FastifyRequest, reply: FastifyReply) {
    const device = (request as any).device;
    await this.deviceRepository.update(device.id, { lastSeenAt: new Date() });
    return reply.send({ status: 'ok' });
  }
}
