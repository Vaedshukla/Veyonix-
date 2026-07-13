import { CompiledPolicy } from '../entities/CompiledPolicy.entity';

export interface ICompiledPolicyRepository {
  save(compiledPolicy: CompiledPolicy): Promise<void>;
  findByDeviceId(deviceId: string): Promise<CompiledPolicy | null>;
}
