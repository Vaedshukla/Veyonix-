import { generateId } from '@shared/utils/id';
import { DomainEventType, publishEvent } from '@shared/events/event-bus';
import type { PoliciesRepository, PolicyEntity } from '../../domain/repositories/policies.repository';
import type { CreatePolicyCommand } from './CreatePolicy.command';

export class CreatePolicyHandler {
  private readonly policiesRepository: PoliciesRepository;

  constructor(dependencies: {
    policiesRepository: PoliciesRepository;
  }) {
    this.policiesRepository = dependencies.policiesRepository;
  }

  async handle(command: CreatePolicyCommand, organizationId: string, createdBy: string): Promise<PolicyEntity> {
    const policyId = generateId();

    const policy = await this.policiesRepository.createPolicy({
      id: policyId,
      organizationId,
      name: command.name,
      description: command.description,
      type: command.type,
      createdBy,
    });

    // Publish event
    await publishEvent(DomainEventType.POLICY_CREATED, {
      aggregateId: policy.id,
      organizationId,
      payload: {
        name: policy.name,
        type: policy.type,
        createdBy,
      },
    });

    return policy;
  }
}
