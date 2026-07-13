import { DeviceEntity } from '../entities/Device.entity';

export interface IDeviceRepository {
  findById(id: string): Promise<DeviceEntity | null>;
  findByOrganization(orgId: string): Promise<DeviceEntity[]>;
  create(device: DeviceEntity): Promise<void>;
  update(device: DeviceEntity): Promise<void>;
}
