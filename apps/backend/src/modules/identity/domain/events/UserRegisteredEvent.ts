import { IdentityDomainEvent } from './IdentityDomainEvent';

export class UserRegisteredEvent extends IdentityDomainEvent {
  readonly eventType = 'identity.user.registered' as const;

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly organizationId: string,
    correlationId?: string | null,
  ) {
    super(correlationId);
  }
}
