import { IPolicyRepository } from '../../domain/repositories/IPolicyRepository';
import { CreatePolicyDTO } from '../dtos/policy.dto';
import crypto from 'crypto';

export class CreatePolicyUseCase {
  constructor(private policyRepo: IPolicyRepository) {}

  async execute(dto: CreatePolicyDTO): Promise<{ policyId: string; versionId: string }> {
    const policyId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const now = new Date();

    await this.policyRepo.createPolicy({
      id: policyId,
      name: dto.name,
      description: dto.description,
      createdAt: now,
      updatedAt: now,
    });

    await this.policyRepo.createVersion({
      id: versionId,
      policyId,
      versionNumber: 1,
      payload: dto.payload,
      createdAt: now,
      createdBy: dto.createdBy,
    });

    return { policyId, versionId };
  }
}
