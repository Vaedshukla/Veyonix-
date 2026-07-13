/**
 * Veyonix — Domain Event Bus
 *
 * Lightweight typed event bus backed by BullMQ.
 * Domain events are published from command handlers after
 * successful state changes, and consumed by workers.
 *
 * This decouples modules: auth doesn't import notifications —
 * it just emits UserRegistered, and notifications subscribes.
 */
import type { Queue } from 'bullmq';
import { analyticsQueue, emailQueue, notificationsQueue, policySyncQueue, agentQueue } from '@/queues';

// ── Domain Event Base ─────────────────────────────────────────

export interface DomainEvent<T = unknown> {
  type: string;
  occurredAt: string;    // ISO 8601
  aggregateId: string;   // The ID of the entity this event is about
  organizationId?: string;
  payload: T;
  metadata?: Record<string, unknown>;
}

// ── Event Type Registry ───────────────────────────────────────

export enum DomainEventType {
  // Auth
  USER_REGISTERED = 'auth.user_registered',
  USER_EMAIL_VERIFIED = 'auth.user_email_verified',
  PASSWORD_RESET_REQUESTED = 'auth.password_reset_requested',
  USER_LOGGED_IN = 'auth.user_logged_in',
  USER_LOGGED_OUT = 'auth.user_logged_out',
  USER_LOGIN_FAILED = 'auth.user_login_failed',

  // Devices
  DEVICE_ENROLLED = 'device.enrolled',
  DEVICE_ONLINE = 'device.online',
  DEVICE_OFFLINE = 'device.offline',
  DEVICE_COMMAND_ISSUED = 'device.command_issued',
  DEVICE_COMMAND_COMPLETED = 'device.command_completed',

  // Policies
  POLICY_CREATED = 'policy.created',
  POLICY_UPDATED = 'policy.updated',
  POLICY_ASSIGNED = 'policy.assigned',
  POLICY_UNASSIGNED = 'policy.unassigned',

  // Analytics
  WEBSITE_BLOCKED = 'analytics.website_blocked',
  FOCUS_SESSION_COMPLETED = 'analytics.focus_session_completed',
  ALERT_GENERATED = 'analytics.alert_generated',

  // Subscriptions
  SUBSCRIPTION_CREATED = 'billing.subscription_created',
  SUBSCRIPTION_EXPIRED = 'billing.subscription_expired',
  SUBSCRIPTION_RENEWED = 'billing.subscription_renewed',
}

// ── Queue routing map ─────────────────────────────────────────
// Each event type maps to which queues should receive it.

type QueueName = 'analytics' | 'email' | 'notifications' | 'policy-sync' | 'agent';

const eventRoutes: Partial<Record<DomainEventType, QueueName[]>> = {
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

const queueMap: Record<QueueName, Queue> = {
  analytics: analyticsQueue,
  email: emailQueue,
  notifications: notificationsQueue,
  'policy-sync': policySyncQueue,
  agent: agentQueue,
};

// ── Event Publisher ───────────────────────────────────────────

/**
 * Publish a domain event.
 *
 * The event is routed to all configured queues for the event type.
 * Workers in those queues handle the actual side effects.
 *
 * Usage:
 *   await publishEvent(DomainEventType.USER_REGISTERED, {
 *     aggregateId: user.id,
 *     organizationId: user.organizationId,
 *     payload: { email: user.email, role: user.role },
 *   });
 */
export async function publishEvent<T>(
  type: DomainEventType,
  options: {
    aggregateId: string;
    organizationId?: string;
    payload: T;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const event: DomainEvent<T> = {
    type,
    occurredAt: new Date().toISOString(),
    aggregateId: options.aggregateId,
    organizationId: options.organizationId,
    payload: options.payload,
    metadata: options.metadata,
  };

  const routes = eventRoutes[type] ?? [];

  await Promise.allSettled(
    routes.map((queueName) =>
      queueMap[queueName].add(type, event, {
        jobId: `${type}:${options.aggregateId}:${Date.now()}`,
      }),
    ),
  );
}
