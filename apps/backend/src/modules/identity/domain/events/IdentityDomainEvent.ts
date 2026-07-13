import { uuidv7 } from 'uuidv7';

/**
 * Base class for all domain events emitted by the Identity module.
 * Subclasses must declare an `eventType` string literal constant.
 */
export abstract class IdentityDomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly correlationId: string | null;

  constructor(correlationId?: string | null) {
    this.eventId = uuidv7();
    this.occurredAt = new Date();
    this.correlationId = correlationId ?? null;
  }

  abstract readonly eventType: string;
}
