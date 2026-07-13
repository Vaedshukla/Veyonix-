import { IDeviceRepository } from '../../domain/repositories/IDeviceRepository';
import { DeviceEntity } from '../../domain/entities/Device.entity';
import { ListDevicesDTO } from '../dtos/device.dto';

export class ListDevicesUseCase {
  constructor(
    private readonly deviceRepo: IDeviceRepository
  ) {}

  async execute(dto: ListDevicesDTO): Promise<DeviceEntity[]> {
    return this.deviceRepo.findByOrganization(dto.organizationId);
  }
}
