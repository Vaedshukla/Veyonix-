/**
 * BullMQ Queue Definitions
 *
 * All queues are defined centrally here.
 * Workers are in src/queues/workers/*.
 * Never import worker code into the main server process.
 */
import { Queue, Worker, QueueEvents } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

import { QueueNames, queueConfig } from '@config/queues';
import { redisUrl } from '@config/redis';

// BullMQ requires a raw IORedis connection (no prefix for BullMQ)
const connection: ConnectionOptions = {
  url: redisUrl,
  maxRetriesPerRequest: null, // Required by BullMQ
};

// ── Queue factory ──────────────────────────────────────────────
function createQueue<T = unknown>(name: string): Queue<T> {
  return new Queue<T>(name, {
    connection,
    defaultJobOptions: queueConfig.defaultJobOptions,
  });
}

// ── Queue instances (Singletons) ──────────────────────────────
export const analyticsQueue = createQueue(QueueNames.ANALYTICS);
export const emailQueue = createQueue(QueueNames.EMAIL);
export const notificationsQueue = createQueue(QueueNames.NOTIFICATIONS);
export const agentQueue = createQueue(QueueNames.AGENT);
export const reportsQueue = createQueue(QueueNames.REPORTS);
export const cleanupQueue = createQueue(QueueNames.CLEANUP);
export const policySyncQueue = createQueue(QueueNames.POLICY_SYNC);
export const webhooksQueue = createQueue(QueueNames.WEBHOOKS);

// ── Queue job types ───────────────────────────────────────────
export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, unknown>;
}

export interface NotificationJobData {
  userId: string;
  organizationId: string;
  title: string;
  body: string;
  channels: string[];
  metadata?: Record<string, unknown>;
}

export interface AgentCommandJobData {
  deviceId: string;
  commandId: string;
  type: string;
  payload?: unknown;
}

export interface PolicySyncJobData {
  deviceId: string;
  policyIds: string[];
  reason: 'POLICY_UPDATED' | 'DEVICE_ENROLLED' | 'MANUAL';
}

export interface AnalyticsJobData {
  type: 'WEBSITE_VISIT' | 'APP_USAGE' | 'BLOCKED_REQUEST' | 'BEHAVIOR_EVENT';
  deviceId: string;
  payload: Record<string, unknown>;
}

export interface WebhookJobData {
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  deliveryId: string;
  attempt: number;
}

export interface ReportJobData {
  reportId: string;
  organizationId: string;
  type: string;
  parameters: Record<string, unknown>;
  requestedBy: string;
}

// ── Convenience job dispatchers ───────────────────────────────

export async function dispatchEmail(data: EmailJobData, opts?: { delay?: number }): Promise<void> {
  await emailQueue.add('send-email', data, {
    delay: opts?.delay,
    priority: 1,
  });
}

export async function dispatchNotification(data: NotificationJobData): Promise<void> {
  await notificationsQueue.add('send-notification', data);
}

export async function dispatchAgentCommand(data: AgentCommandJobData): Promise<void> {
  await agentQueue.add('agent-command', data, {
    priority: 1, // High priority
    attempts: 5,
  });
}

export async function dispatchPolicySync(data: PolicySyncJobData): Promise<void> {
  await policySyncQueue.add('sync-policy', data);
}

export async function dispatchAnalyticsEvent(data: AnalyticsJobData): Promise<void> {
  await analyticsQueue.add('process-event', data, {
    removeOnComplete: { count: 1000 },
  });
}

export async function dispatchWebhook(data: WebhookJobData): Promise<void> {
  await webhooksQueue.add('deliver-webhook', data);
}

export async function dispatchReport(data: ReportJobData): Promise<void> {
  await reportsQueue.add('generate-report', data);
}
