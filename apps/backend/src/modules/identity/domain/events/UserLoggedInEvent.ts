import { IdentityDomainEvent } from './IdentityDomainEvent';

export class UserLoggedInEvent extends IdentityDomainEvent {
  readonly eventType = 'identity.user.logged_in' as const;

  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly ipAddress: string | null,
    correlationId?: string | null,
  ) {
    super(correlationId);
  }
}
