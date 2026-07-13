import type { FastifyRequest, FastifyReply } from 'fastify';

import { UnauthorizedError } from '@shared/errors/DomainError';
import type { TokenProvider } from '../../modules/auth/infrastructure/jwt/jwt.adapter';
import type { DevicesRepository } from '../../modules/devices/domain/repositories/devices.repository';

// Augment FastifyRequest to include device context
declare module 'fastify' {
  interface FastifyRequest {
    device?: {
      id: string;
      organizationId: string;
      macAddress: string;
    };
  }
}

/**
 * Agent Authentication Middleware / preHandler hook.
 * Verifies JWT token signed specifically for Desktop Agents.
 * Populates request.device context.
 */
export async function authenticateAgent(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Agent authentication required. Missing token.');
  }

  const token = authHeader.substring(7);

  try {
    const tokenProvider = request.container.resolve<TokenProvider>('tokenProvider');
    const devicesRepository = request.container.resolve<DevicesRepository>('devicesRepository');

    // 1. Verify agent token signature
    const payload = tokenProvider.verifyAgent(token);

    // 2. Validate device enrollment
    const device = await devicesRepository.findById(payload.sub);
    if (!device || !device.isManaged) {
      throw new UnauthorizedError('Device is not enrolled or is no longer managed.');
    }

    // 3. Populate request context
    request.device = {
      id: device.id,
      organizationId: device.organizationId,
      macAddress: device.macAddress,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Invalid or expired agent credential token.', undefined);
  }
}
