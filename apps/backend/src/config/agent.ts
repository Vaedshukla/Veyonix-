import { env } from './index';

export const agentConfig = {
  heartbeat: {
    intervalMs: env.AGENT_HEARTBEAT_INTERVAL_MS,
    offlineThresholdMs: env.AGENT_OFFLINE_THRESHOLD_MS,
  },
  connection: {
    maxConnections: env.AGENT_MAX_CONNECTIONS,
  },
  certificate: {
    ttlDays: env.AGENT_JWT_CERTIFICATE_TTL_DAYS,
  },
  protocol: {
    version: 'v1',
    supportedVersions: ['v1'],
  },
  // Polling fallback interval when WebSocket is not available
  pollIntervalMs: 10000,
} as const;
