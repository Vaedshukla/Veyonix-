import { IdentityDomainEvent } from './IdentityDomainEvent';

export class RefreshTokenRevokedEvent extends IdentityDomainEvent {
  readonly eventType = 'identity.token.family_revoked' as const;

  constructor(
    public readonly familyId: string,
    public readonly userId: string,
    public readonly reason: 'REUSE_DETECTED' | 'USER_LOGOUT' | 'ADMIN_REVOCATION',
    correlationId?: string | null,
  ) {
    super(correlationId);
  }
}
