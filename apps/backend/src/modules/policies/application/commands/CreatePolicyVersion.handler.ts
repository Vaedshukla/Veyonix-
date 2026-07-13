import { generateId } from '@shared/utils/id';
import { PolicyNotFoundError } from '../../domain/errors/PolicyErrors';
import { DomainEventType, publishEvent } from '@shared/events/event-bus';
import type { PoliciesRepository, PolicyVersionEntity } from '../../domain/repositories/policies.repository';
import type { CreatePolicyVersionCommand } from './CreatePolicyVersion.command';

export class CreatePolicyVersionHandler {
  private readonly policiesRepository: PoliciesRepository;

  constructor(dependencies: {
    policiesRepository: PoliciesRepository;
  }) {
    this.policiesRepository = dependencies.policiesRepository;
  }

  async handle(policyId: string, command: CreatePolicyVersionCommand, createdBy: string): Promise<PolicyVersionEntity> {
    const policy = await this.policiesRepository.findById(policyId);
    if (!policy) {
      throw new PolicyNotFoundError(policyId);
    }

    const nextVersion = policy.currentVersion + 1;
    const versionId = generateId();

    // Map and inject UUIDs for children
    const ruleGroups = command.ruleGroups.map((rg) => ({
      id: generateId(),
      name: rg.name,
      operator: rg.operator,
      rules: rg.rules.map((r) => ({
        id: generateId(),
        type: r.type,
        action: r.action,
        target: r.target,
        priority: r.priority,
      })),
    }));

    const version = await this.policiesRepository.createPolicyVersion({
      id: versionId,
      policyId,
      version: nextVersion,
      changeNotes: command.changeNotes,
      createdBy,
      ruleGroups,
    });

    // Publish event for synchronization triggers
    await publishEvent(DomainEventType.POLICY_UPDATED, {
      aggregateId: policyId,
      organizationId: policy.organizationId,
      payload: {
        version: nextVersion,
        changeNotes: command.changeNotes,
        createdBy,
      },
    });

    return version;
  }
}
