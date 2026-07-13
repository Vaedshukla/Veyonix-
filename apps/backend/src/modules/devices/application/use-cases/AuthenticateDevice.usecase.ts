import { IDeviceRepository } from '../../domain/repositories/IDeviceRepository';
import { AuthenticateDeviceDTO } from '../dtos/device.dto';
import { DeviceNotFoundError, DeviceSuspendedError } from '../../domain/errors/DeviceDomainError';

export class AuthenticateDeviceUseCase {
  constructor(
    private readonly deviceRepo: IDeviceRepository,
    private readonly hashService: { compare: (data: string, encrypted: string) => Promise<boolean> }
  ) {}

  async execute(dto: AuthenticateDeviceDTO): Promise<boolean> {
    const device = await this.deviceRepo.findById(dto.deviceId);

    if (!device) {
      throw new DeviceNotFoundError(dto.deviceId);
    }

    if (device.status === 'SUSPENDED' || device.status === 'DECOMMISSIONED') {
      throw new DeviceSuspendedError(dto.deviceId);
    }

    const isValid = await this.hashService.compare(dto.deviceSecret, device.deviceSecretHash);
    
    if (!isValid) {
      return false;
    }

    return true;
  }
}
