import { ICompiledPolicyRepository } from '../../domain/repositories/ICompiledPolicyRepository';
import { PolicyDomainError } from '../../domain/errors/PolicyDomainError';

export interface GetDevicePolicyResult {
  notModified: boolean;
  hash: string;
  payload?: Record<string, any>;
}

export class GetDevicePolicyUseCase {
  constructor(private compiledRepo: ICompiledPolicyRepository) {}

  async execute(deviceId: string, clientHash?: string): Promise<GetDevicePolicyResult> {
    const compiledPolicy = await this.compiledRepo.findByDeviceId(deviceId);
    
    if (!compiledPolicy) {
      throw new PolicyDomainError('NO_COMPILED_POLICY', `No compiled policy found for device ${deviceId}`);
    }

    if (clientHash && compiledPolicy.hash === clientHash) {
      return {
        notModified: true,
        hash: compiledPolicy.hash
      };
    }

    return {
      notModified: false,
      hash: compiledPolicy.hash,
      payload: compiledPolicy.payload
    };
  }
}
