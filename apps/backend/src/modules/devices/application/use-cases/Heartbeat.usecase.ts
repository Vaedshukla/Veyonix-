import { IDeviceRepository } from '../../domain/repositories/IDeviceRepository';
import { HeartbeatDTO } from '../dtos/device.dto';
import { DeviceNotFoundError } from '../../domain/errors/DeviceDomainError';

export class HeartbeatUseCase {
  constructor(
    private readonly deviceRepo: IDeviceRepository
  ) {}

  async execute(dto: HeartbeatDTO): Promise<void> {
    const device = await this.deviceRepo.findById(dto.deviceId);

    if (!device) {
      throw new DeviceNotFoundError(dto.deviceId);
    }

    device.updateHeartbeat();
    await this.deviceRepo.update(device);
  }
}
