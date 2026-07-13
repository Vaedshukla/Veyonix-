import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthenticateDeviceUseCase } from '../../../src/modules/devices/application/use-cases/AuthenticateDevice.usecase';
import { DeviceEntity } from '../../../src/modules/devices/domain/entities/Device.entity';
import { DeviceSuspendedError } from '../../../src/modules/devices/domain/errors/DeviceDomainError';

describe('AuthenticateDeviceUseCase', () => {
  let useCase: AuthenticateDeviceUseCase;
  let deviceRepo: any;
  let hashService: any;

  beforeEach(() => {
    deviceRepo = {
      findById: vi.fn(),
    };
    hashService = {
      compare: vi.fn(),
    };

    useCase = new AuthenticateDeviceUseCase(deviceRepo, hashService);
  });

  const createDevice = (status: any = 'ACTIVE') => new DeviceEntity({
    id: 'device-id',
    organizationId: 'org-1',
    hostname: 'host1',
    serialNumber: null,
    os: 'linux',
    architecture: 'amd64',
    status,
    publicKey: null,
    deviceSecretHash: 'hashed_secret',
    agentVersion: '1.0',
    enrollmentStatus: 'COMPLETED',
    enrollmentMethod: 'MANUAL',
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  it('should return true for valid credentials', async () => {
    deviceRepo.findById.mockResolvedValue(createDevice());
    hashService.compare.mockResolvedValue(true);

    const result = await useCase.execute({
      deviceId: 'device-id',
      deviceSecret: 'valid_secret',
    });

    expect(result).toBe(true);
  });

  it('should return false for invalid secret', async () => {
    deviceRepo.findById.mockResolvedValue(createDevice());
    hashService.compare.mockResolvedValue(false);

    const result = await useCase.execute({
      deviceId: 'device-id',
      deviceSecret: 'invalid_secret',
    });

    expect(result).toBe(false);
  });

  it('should throw if device is suspended', async () => {
    deviceRepo.findById.mockResolvedValue(createDevice('SUSPENDED'));

    await expect(useCase.execute({
      deviceId: 'device-id',
      deviceSecret: 'secret',
    })).rejects.toThrow(DeviceSuspendedError);
  });
});
