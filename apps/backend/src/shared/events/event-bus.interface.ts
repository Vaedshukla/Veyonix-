import type { DomainEvent, DomainEventType } from './event-bus';

export interface EventBus {
  publish<T>(
    type: DomainEventType,
    options: {
      aggregateId: string;
      organizationId?: string;
      payload: T;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void>;
}
