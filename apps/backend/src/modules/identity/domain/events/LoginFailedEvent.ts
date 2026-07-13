import { IdentityDomainEvent } from './IdentityDomainEvent';

export class LoginFailedEvent extends IdentityDomainEvent {
  readonly eventType = 'identity.user.login_failed' as const;

  constructor(
    public readonly email: string,
    public readonly reason:
      | 'INVALID_CREDENTIALS'
      | 'ACCOUNT_LOCKED'
      | 'ACCOUNT_INACTIVE'
      | 'EMAIL_NOT_VERIFIED',
    public readonly ipAddress: string | null,
    correlationId?: string | null,
  ) {
    super(correlationId);
  }
}
