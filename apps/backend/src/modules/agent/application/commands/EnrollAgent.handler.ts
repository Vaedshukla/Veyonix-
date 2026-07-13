import * as crypto from 'crypto';
import { generateId } from '@shared/utils/id';
import { DeviceAlreadyEnrolledError } from '../../../devices/domain/errors/DeviceErrors';
import { DomainEventType, publishEvent } from '@shared/events/event-bus';
import { DeviceStatus } from '@veyonix/shared-types';
import type { DevicesRepository, DeviceEntity } from '../../../devices/domain/repositories/devices.repository';
import type { TokenProvider } from '../../../auth/infrastructure/jwt/jwt.adapter';
import type { EnrollAgentCommand } from './EnrollAgent.command';

export interface EnrollAgentResult {
  device: DeviceEntity;
  token: string;
}

export class EnrollAgentHandler {
  private readonly devicesRepository: DevicesRepository;
  private readonly tokenProvider: TokenProvider;

  constructor(dependencies: {
    devicesRepository: DevicesRepository;
    tokenProvider: TokenProvider;
  }) {
    this.devicesRepository = dependencies.devicesRepository;
    this.tokenProvider = dependencies.tokenProvider;
  }

  async handle(command: EnrollAgentCommand): Promise<EnrollAgentResult> {
    const existing = await this.devicesRepository.findByMacAddress(command.macAddress);
    
    if (existing && existing.isManaged) {
      throw new DeviceAlreadyEnrolledError(command.macAddress);
    }

    let device: DeviceEntity;

    if (existing) {
      // Re-enrollment or transition from unmanaged
      device = await this.devicesRepository.update(existing.id, {
        hostname: command.hostname,
        name: command.name,
        platform: command.platform,
        osVersion: command.osVersion ?? null,
        agentVersion: command.agentVersion ?? null,
        status: DeviceStatus.ONLINE,
        isManaged: true,
        enrolledAt: new Date(),
        lastSeenAt: new Date(),
      });
    } else {
      const deviceId = generateId();
      device = await this.devicesRepository.create({
        id: deviceId,
        organizationId: command.organizationId,
        macAddress: command.macAddress,
        hostname: command.hostname,
        name: command.name,
        platform: command.platform,
        status: DeviceStatus.ONLINE,
      });

      // Update enrollment markers
      device = await this.devicesRepository.update(device.id, {
        osVersion: command.osVersion ?? null,
        agentVersion: command.agentVersion ?? null,
        isManaged: true,
        enrolledAt: new Date(),
        lastSeenAt: new Date(),
      });
    }

    // Generate SHA-256 fingerprint of the P-256 public key
    const fingerprint = crypto.createHash('sha256').update(command.publicKey).digest('hex');

    // Persist Device Certificate mapping for cryptographic authentication
    await this.devicesRepository.saveCertificate({
      id: generateId(),
      deviceId: device.id,
      fingerprint,
      publicKey: command.publicKey,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiration
    });

    // Generate Agent JWT Token (Fingerprint matches public key hash)
    const token = this.tokenProvider.signAgent({
      sub: device.id,
      orgId: device.organizationId,
      fingerprint,
    });

    // Dispatch event
    await publishEvent(DomainEventType.DEVICE_ENROLLED, {
      aggregateId: device.id,
      organizationId: device.organizationId,
      payload: {
        macAddress: device.macAddress,
        platform: device.platform,
        hostname: device.hostname,
      },
    });

    return {
      device,
      token,
    };
  }
}

