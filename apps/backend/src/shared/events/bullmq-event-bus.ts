import type { Queue } from 'bullmq';

import { EventBus } from './event-bus.interface';
import { DomainEvent, DomainEventType } from './event-bus';
import { analyticsQueue, emailQueue, notificationsQueue, policySyncQueue, agentQueue } from '@/queues';

type QueueName = 'analytics' | 'email' | 'notifications' | 'policy-sync' | 'agent';

export class BullMQEventBus implements EventBus {
  private readonly eventRoutes: Partial<Record<DomainEventType, QueueName[]>> = {
    [DomainEventType.USER_REGISTERED]: ['email', 'notifications'],
    [DomainEventType.USER_EMAIL_VERIFIED]: ['notifications'],
    [DomainEventType.PASSWORD_RESET_REQUESTED]: ['email'],
    [DomainEventType.DEVICE_ENROLLED]: ['notifications', 'analytics'],
    [DomainEventType.DEVICE_ONLINE]: ['analytics'],
    [DomainEventType.DEVICE_OFFLINE]: ['analytics', 'notifications'],
    [DomainEventType.POLICY_UPDATED]: ['policy-sync'],
    [DomainEventType.POLICY_ASSIGNED]: ['policy-sync', 'analytics'],
    [DomainEventType.ALERT_GENERATED]: ['notifications'],
    [DomainEventType.SUBSCRIPTION_EXPIRED]: ['notifications'],
    [DomainEventType.DEVICE_COMMAND_ISSUED]: ['agent'],
    [DomainEventType.FOCUS_SESSION_COMPLETED]: ['analytics'],
  };

  private readonly queueMap: Record<QueueName, Queue> = {
    analytics: analyticsQueue,
    email: emailQueue,
    notifications: notificationsQueue,
    'policy-sync': policySyncQueue,
    agent: agentQueue,
  };

  async publish<T>(
    type: DomainEventType,
    options: {
      aggregateId: string;
      organizationId?: string;
      payload: T;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const event: DomainEvent<T> = {
      type,
      occurredAt: new Date().toISOString(),
      aggregateId: options.aggregateId,
      organizationId: options.organizationId,
      payload: options.payload,
      metadata: options.metadata,
    };

    const routes = this.eventRoutes[type] ?? [];

    await Promise.allSettled(
      routes.map((queueName) =>
        this.queueMap[queueName].add(type, event, {
          jobId: `${type}:${options.aggregateId}:${Date.now()}`,
        })
      )
    );
  }
}
