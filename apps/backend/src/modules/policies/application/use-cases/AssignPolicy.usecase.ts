import { IPolicyAssignmentRepository } from '../../domain/repositories/IPolicyAssignmentRepository';
import { IPolicyRepository } from '../../domain/repositories/IPolicyRepository';
import { AssignPolicyDTO } from '../dtos/policy.dto';
import { PolicyDomainError } from '../../domain/errors/PolicyDomainError';
import crypto from 'crypto';

export class AssignPolicyUseCase {
  constructor(
    private assignmentRepo: IPolicyAssignmentRepository,
    private policyRepo: IPolicyRepository
  ) {}

  async execute(dto: AssignPolicyDTO): Promise<{ assignmentId: string }> {
    const policy = await this.policyRepo.findById(dto.policyId);
    if (!policy) {
      throw new PolicyDomainError('POLICY_NOT_FOUND', `Policy ${dto.policyId} not found`);
    }

    const assignmentId = crypto.randomUUID();
    
    await this.assignmentRepo.createAssignment({
      id: assignmentId,
      policyId: dto.policyId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      priority: dto.priority,
      createdAt: new Date(),
    });

    return { assignmentId };
  }
}
