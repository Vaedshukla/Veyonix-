import type { FastifyRequest, FastifyReply } from 'fastify';

import { UnauthorizedError } from '@shared/errors/DomainError';
import { verifySignature } from '@shared/utils/crypto';
import type { DevicesRepository } from '../../modules/devices/domain/repositories/devices.repository';

// Extend FastifyRequest to support device profile context
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
 * IoT-Style Agent Authentication Guard.
 * Uses ECDSA P-256 (prime256v1 / secp256r1) asymmetric key verification.
 * Verifies request signature to prevent request tampering and replay attacks.
 */
export async function authenticateAgentCrypto(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const deviceId = request.headers['x-device-id'] as string;
  const signature = request.headers['x-signature'] as string;
  const timestamp = request.headers['x-timestamp'] as string;

  if (!deviceId || !signature || !timestamp) {
    throw new UnauthorizedError('Agent cryptographic headers missing. Required: x-device-id, x-signature, x-timestamp.');
  }

  // 1. Verify Timestamp Age (max 5 minutes skew to prevent replay attacks)
  const requestTime = new Date(timestamp).getTime();
  const serverTime = Date.now();
  if (isNaN(requestTime) || Math.abs(serverTime - requestTime) > 5 * 60 * 1000) {
    throw new UnauthorizedError('Request timestamp is invalid or has expired (exceeded 5 min skew limit).');
  }

  try {
    const devicesRepository = request.container.resolve<DevicesRepository>('devicesRepository');

    // 2. Fetch Device Certificate
    const certificate = await devicesRepository.findActiveCertificate(deviceId);
    if (!certificate || certificate.isRevoked) {
      throw new UnauthorizedError('No active certificate found for this device or certificate is revoked.');
    }

    // 3. Compile signature validation payload
    // Canonical format: JSON string of body concatenated with timestamp
    const requestBody = request.body ? JSON.stringify(request.body) : '';
    const payload = `${requestBody}${timestamp}`;

    // 4. Verify Cryptographic Signature
    const isValid = verifySignature(payload, signature, certificate.publicKey);
    if (!isValid) {
      throw new UnauthorizedError('Cryptographic signature verification failed. Request payload is untrusted.');
    }

    // 5. Populate device context
    const device = await devicesRepository.findById(deviceId);
    if (!device || !device.isManaged) {
      throw new UnauthorizedError('Device is not enrolled or is no longer managed.');
    }

    request.device = {
      id: device.id,
      organizationId: device.organizationId,
      macAddress: device.macAddress,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Agent cryptographic authentication error.', undefined);
  }
}
