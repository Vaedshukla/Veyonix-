import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetDevicePolicyUseCase } from '../../../src/modules/policies/application/use-cases/GetDevicePolicy.usecase';
import { ICompiledPolicyRepository } from '../../../src/modules/policies/domain/repositories/ICompiledPolicyRepository';
import { PolicyDomainError } from '../../../src/modules/policies/domain/errors/PolicyDomainError';

describe('GetDevicePolicyUseCase', () => {
  let useCase: GetDevicePolicyUseCase;
  let mockRepo: ICompiledPolicyRepository;

  beforeEach(() => {
    mockRepo = {
      save: vi.fn(),
      findByDeviceId: vi.fn(),
    };
    useCase = new GetDevicePolicyUseCase(mockRepo);
  });

  it('should return policy and hash when clientHash is not provided', async () => {
    (mockRepo.findByDeviceId as any).mockResolvedValue({
      deviceId: 'd1',
      payload: { a: 1 },
      hash: 'abc',
      compiledAt: new Date()
    });

    const result = await useCase.execute('d1');
    expect(result.notModified).toBe(false);
    expect(result.hash).toBe('abc');
    expect(result.payload).toEqual({ a: 1 });
  });

  it('should return notModified true when clientHash matches', async () => {
    mockRepo.findByDeviceId.mockResolvedValue({
      deviceId: 'd1',
      payload: { a: 1 },
      hash: 'abc',
      compiledAt: new Date()
    });

    const result = await useCase.execute('d1', 'abc');
    expect(result.notModified).toBe(true);
    expect(result.hash).toBe('abc');
    expect(result.payload).toBeUndefined();
  });

  it('should return modified data when clientHash does not match', async () => {
    mockRepo.findByDeviceId.mockResolvedValue({
      deviceId: 'd1',
      payload: { a: 1 },
      hash: 'abc',
      compiledAt: new Date()
    });

    const result = await useCase.execute('d1', 'xyz');
    expect(result.notModified).toBe(false);
    expect(result.hash).toBe('abc');
    expect(result.payload).toEqual({ a: 1 });
  });

  it('should throw error when no compiled policy exists', async () => {
    mockRepo.findByDeviceId.mockResolvedValue(null);

    await expect(useCase.execute('d1')).rejects.toThrow(PolicyDomainError);
  });
});
