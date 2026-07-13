import { uuidv7 } from 'uuidv7';

export class UserJoinedOrganizationEvent {
  readonly eventId: string;
  readonly eventType = 'organizations.membership.created' as const;
  readonly occurredAt: Date;

  constructor(
    public readonly userId: string,
    public readonly organizationId: string,
    public readonly membershipId: string,
    public readonly correlationId?: string | null,
  ) {
    this.eventId = uuidv7();
    this.occurredAt = new Date();
  }
}
