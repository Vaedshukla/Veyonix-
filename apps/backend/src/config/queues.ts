export const QueueNames = {
  ANALYTICS: 'analytics',
  EMAIL: 'email',
  NOTIFICATIONS: 'notifications',
  AGENT: 'agent',
  REPORTS: 'reports',
  CLEANUP: 'cleanup',
  POLICY_SYNC: 'policy-sync',
  WEBHOOKS: 'webhooks',
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];

export const queueConfig = {
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
  },
  concurrency: {
    analytics: 5,
    email: 3,
    notifications: 5,
    agent: 10,
    reports: 2,
    cleanup: 1,
    'policy-sync': 5,
    webhooks: 5,
  },
} as const;
