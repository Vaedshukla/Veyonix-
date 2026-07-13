import { IdentityDomainEvent } from './IdentityDomainEvent';

export class SessionRevokedEvent extends IdentityDomainEvent {
  readonly eventType = 'identity.session.revoked' as const;

  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly reason: string,
    correlationId?: string | null,
  ) {
    super(correlationId);
  }
}
