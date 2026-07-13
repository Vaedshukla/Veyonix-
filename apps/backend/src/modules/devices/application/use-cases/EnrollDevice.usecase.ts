import { IEnrollmentTokenRepository } from '../../domain/repositories/IEnrollmentTokenRepository';
import { IDeviceRepository } from '../../domain/repositories/IDeviceRepository';
import { DeviceEntity } from '../../domain/entities/Device.entity';
import { EnrollDeviceDTO } from '../dtos/device.dto';
import { InvalidEnrollmentTokenError } from '../../domain/errors/DeviceDomainError';
import { DeviceEnrolledEvent } from '../../domain/events/DeviceEvents';
import { uuidv7 } from 'uuidv7';
import * as crypto from 'node:crypto';

export class EnrollDeviceUseCase {
  constructor(
    private readonly enrollmentTokenRepo: IEnrollmentTokenRepository,
    private readonly deviceRepo: IDeviceRepository,
    private readonly hashService: { hash: (data: string) => Promise<string> },
    private readonly eventBus: { emit: (event: any) => Promise<void> }
  ) {}

  async execute(dto: EnrollDeviceDTO): Promise<{ deviceId: string; deviceSecret: string }> {
    const tokenHash = await this.hashService.hash(dto.rawToken);
    const token = await this.enrollmentTokenRepo.findByTokenHash(tokenHash);

    if (!token) {
      throw new InvalidEnrollmentTokenError();
    }

    token.consume();
    await this.enrollmentTokenRepo.update(token);

    const deviceSecret = crypto.randomBytes(32).toString('hex');
    const deviceSecretHash = await this.hashService.hash(deviceSecret);

    const device = new DeviceEntity({
      id: uuidv7(),
      organizationId: token.organizationId,
      hostname: dto.hostname,
      serialNumber: null,
      os: dto.os,
      architecture: dto.architecture,
      status: 'ACTIVE',
      publicKey: null,
      deviceSecretHash,
      agentVersion: dto.agentVersion,
      enrollmentStatus: 'COMPLETED',
      enrollmentMethod: 'MANUAL',
      lastSeenAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    await this.deviceRepo.create(device);

    await this.eventBus.emit(new DeviceEnrolledEvent(device.id, device.organizationId));

    return {
      deviceId: device.id,
      deviceSecret,
    };
  }
}
