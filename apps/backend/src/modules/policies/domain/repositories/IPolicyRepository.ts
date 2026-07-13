import { Policy } from '../entities/Policy.entity';
import { PolicyVersion } from '../entities/PolicyVersion.entity';

export interface IPolicyRepository {
  createPolicy(policy: Policy): Promise<void>;
  updatePolicy(policy: Policy): Promise<void>;
  findById(id: string): Promise<Policy | null>;
  
  createVersion(version: PolicyVersion): Promise<void>;
  getLatestVersion(policyId: string): Promise<PolicyVersion | null>;
  getVersion(policyId: string, versionNumber: number): Promise<PolicyVersion | null>;
}
