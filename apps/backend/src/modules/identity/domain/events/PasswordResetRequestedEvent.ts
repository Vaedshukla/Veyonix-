import { IdentityDomainEvent } from './IdentityDomainEvent';

export class PasswordResetRequestedEvent extends IdentityDomainEvent {
  readonly eventType = 'identity.password.reset_requested' as const;

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly resetTokenHash: string,
    correlationId?: string | null,
  ) {
    super(correlationId);
  }
}
