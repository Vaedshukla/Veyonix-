import { IPolicyRepository } from '../../domain/repositories/IPolicyRepository';
import { UpdatePolicyDTO } from '../dtos/policy.dto';
import { PolicyDomainError } from '../../domain/errors/PolicyDomainError';
import crypto from 'crypto';

export class UpdatePolicyUseCase {
  constructor(private policyRepo: IPolicyRepository) {}

  async execute(dto: UpdatePolicyDTO): Promise<{ policyId: string; newVersionId: string }> {
    const policy = await this.policyRepo.findById(dto.policyId);
    if (!policy) {
      throw new PolicyDomainError('POLICY_NOT_FOUND', `Policy ${dto.policyId} not found`);
    }

    const latestVersion = await this.policyRepo.getLatestVersion(dto.policyId);
    const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;
    const newVersionId = crypto.randomUUID();
    const now = new Date();

    await this.policyRepo.createVersion({
      id: newVersionId,
      policyId: dto.policyId,
      versionNumber: newVersionNumber,
      payload: dto.payload,
      createdAt: now,
      createdBy: dto.updatedBy,
    });
    
    policy.updatedAt = now;
    await this.policyRepo.updatePolicy(policy);

    return { policyId: dto.policyId, newVersionId };
  }
}
