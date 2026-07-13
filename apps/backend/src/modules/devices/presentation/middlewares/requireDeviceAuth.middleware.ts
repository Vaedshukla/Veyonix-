import { FastifyRequest, FastifyReply } from 'fastify';
import { IDeviceRepository } from '../../infrastructure/repositories/PrismaDeviceRepository';
import { DeviceStatus } from '@prisma/client';

export const requireDeviceAuth = (
  jwtTokenService: any,
  deviceRepository: IDeviceRepository
) => async (request: FastifyRequest, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = await jwtTokenService.verify(token);
    if (payload.type !== 'device' || !payload.sub) {
      return reply.status(403).send({ error: 'Invalid token type' });
    }

    const device = await deviceRepository.findById(payload.sub);
    if (!device) {
      return reply.status(401).send({ error: 'Device not found' });
    }

    if (device.status === DeviceStatus.SUSPENDED || device.status === DeviceStatus.DECOMMISSIONED) {
      return reply.status(403).send({ error: 'Device is not active' });
    }

    (request as any).device = device;
  } catch (err) {
    return reply.status(401).send({ error: 'Invalid token' });
  }
};
