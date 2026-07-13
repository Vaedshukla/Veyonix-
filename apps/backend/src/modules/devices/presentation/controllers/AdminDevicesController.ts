import { FastifyRequest, FastifyReply } from 'fastify';
import { IDeviceRepository } from '../../infrastructure/repositories/PrismaDeviceRepository';
import { IEnrollmentTokenRepository } from '../../infrastructure/repositories/PrismaEnrollmentTokenRepository';
import { IDeviceAssignmentRepository } from '../../infrastructure/repositories/PrismaDeviceAssignmentRepository';
import crypto from 'crypto';

export class AdminDevicesController {
  constructor(
    private readonly deviceRepository: IDeviceRepository,
    private readonly enrollmentTokenRepository: IEnrollmentTokenRepository,
    private readonly deviceAssignmentRepository: IDeviceAssignmentRepository
  ) {}

  async generateToken(request: FastifyRequest, reply: FastifyReply) {
    const { orgId } = request.params as any;
    const { maxUses = 1, expiresInDays = 1 } = request.body as any;
    const user = (request as any).user;

    const tokenRaw = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const token = await this.enrollmentTokenRepository.create({
      organizationId: orgId,
      tokenHash,
      expiresAt,
      maxUses,
      createdBy: user.id
    });

    return reply.send({ data: { token: tokenRaw, expiresAt: token.expiresAt } });
  }

  async listDevices(request: FastifyRequest, reply: FastifyReply) {
    const { orgId } = request.params as any;
    const devices = await this.deviceRepository.findByOrganizationId(orgId);
    return reply.send({ data: devices });
  }

  async assignDevice(request: FastifyRequest, reply: FastifyReply) {
    const { orgId, deviceId } = request.params as any;
    const { userId } = request.body as any;
    const user = (request as any).user;

    const assignment = await this.deviceAssignmentRepository.create({
      deviceId,
      userId,
      assignedBy: user.id
    });

    return reply.send({ data: assignment });
  }
}
