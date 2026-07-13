import { uuidv7 } from 'uuidv7';

export class OrganizationCreatedEvent {
  readonly eventId: string;
  readonly eventType = 'organizations.organization.created' as const;
  readonly occurredAt: Date;

  constructor(
    public readonly organizationId: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly createdByUserId: string,
    public readonly correlationId?: string | null,
  ) {
    this.eventId = uuidv7();
    this.occurredAt = new Date();
  }
}
