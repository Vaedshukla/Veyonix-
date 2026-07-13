import { IPolicyAssignmentRepository } from '../../domain/repositories/IPolicyAssignmentRepository';
import { IPolicyRepository } from '../../domain/repositories/IPolicyRepository';
import { ICompiledPolicyRepository } from '../../domain/repositories/ICompiledPolicyRepository';
import { PolicyCompilerService, ApplicablePolicy } from '../../domain/services/PolicyCompilerService';
import crypto from 'crypto';

export class CompileEffectivePolicyUseCase {
  constructor(
    private assignmentRepo: IPolicyAssignmentRepository,
    private policyRepo: IPolicyRepository,
    private compiledRepo: ICompiledPolicyRepository,
    private compilerService: PolicyCompilerService
  ) {}

  async execute(deviceId: string): Promise<void> {
    const assignments = await this.assignmentRepo.findApplicableForDevice(deviceId);
    
    const applicablePolicies: ApplicablePolicy[] = [];
    for (const assignment of assignments) {
      const version = await this.policyRepo.getLatestVersion(assignment.policyId);
      if (version) {
        applicablePolicies.push({ assignment, version });
      }
    }

    const compiledPayload = this.compilerService.compile(applicablePolicies);
    const payloadString = JSON.stringify(compiledPayload);
    const hash = crypto.createHash('sha256').update(payloadString).digest('hex');

    await this.compiledRepo.save({
      deviceId,
      payload: compiledPayload,
      hash,
      compiledAt: new Date()
    });
  }
}
