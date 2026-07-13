import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnrollDeviceUseCase } from '../../../src/modules/devices/application/use-cases/EnrollDevice.usecase';
import { EnrollmentTokenEntity } from '../../../src/modules/devices/domain/entities/EnrollmentToken.entity';
import { InvalidEnrollmentTokenError, TokenExpiredOrExhaustedError } from '../../../src/modules/devices/domain/errors/DeviceDomainError';

describe('EnrollDeviceUseCase', () => {
  let useCase: EnrollDeviceUseCase;
  let enrollmentTokenRepo: any;
  let deviceRepo: any;
  let hashService: any;
  let eventBus: any;

  beforeEach(() => {
    enrollmentTokenRepo = {
      findByTokenHash: vi.fn(),
      update: vi.fn(),
    };
    deviceRepo = {
      create: vi.fn(),
    };
    hashService = {
      hash: vi.fn().mockImplementation(async (data) => `hashed_${data}`),
    };
    eventBus = {
      emit: vi.fn(),
    };

    useCase = new EnrollDeviceUseCase(enrollmentTokenRepo, deviceRepo, hashService, eventBus);
  });

  it('should enroll a device successfully', async () => {
    const token = new EnrollmentTokenEntity({
      id: 'token-id',
      organizationId: 'org-1',
      tokenHash: 'hashed_raw_token',
      expiresAt: new Date(Date.now() + 100000),
      maxUses: 1,
      uses: 0,
      createdBy: 'user-1',
      createdAt: new Date(),
    });

    enrollmentTokenRepo.findByTokenHash.mockResolvedValue(token);

    const result = await useCase.execute({
      rawToken: 'raw_token',
      hostname: 'host1',
      os: 'linux',
      architecture: 'amd64',
      agentVersion: '1.0.0',
    });

    expect(result.deviceId).toBeDefined();
    expect(result.deviceSecret).toBeDefined();
    expect(enrollmentTokenRepo.update).toHaveBeenCalled();
    expect(deviceRepo.create).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalled();
  });

  it('should throw if token is invalid', async () => {
    enrollmentTokenRepo.findByTokenHash.mockResolvedValue(null);

    await expect(useCase.execute({
      rawToken: 'invalid',
      hostname: 'h', os: 'o', architecture: 'a', agentVersion: 'v'
    })).rejects.toThrow(InvalidEnrollmentTokenError);
  });

  it('should throw if token is exhausted', async () => {
    const token = new EnrollmentTokenEntity({
      id: 'token-id',
      organizationId: 'org-1',
      tokenHash: 'hashed_raw_token',
      expiresAt: new Date(Date.now() + 100000),
      maxUses: 1,
      uses: 1, // exhausted
      createdBy: 'user-1',
      createdAt: new Date(),
    });

    enrollmentTokenRepo.findByTokenHash.mockResolvedValue(token);

    await expect(useCase.execute({
      rawToken: 'raw_token',
      hostname: 'h', os: 'o', architecture: 'a', agentVersion: 'v'
    })).rejects.toThrow(TokenExpiredOrExhaustedError);
  });
});
