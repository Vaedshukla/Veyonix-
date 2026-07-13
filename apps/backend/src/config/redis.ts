/**
 * Veyonix Backend — Redis Configuration
 */
import type { RedisOptions } from 'ioredis';
import { env } from './index';

export const redisUrl = env.REDIS_URL;

export const redisConfig: Partial<RedisOptions> = {
  password: env.REDIS_PASSWORD,
  db: env.REDIS_DB,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10_000,
  commandTimeout: 5_000,
  retryStrategy(times: number): number | null {
    if (times > 10) {
      return null; // Stop retrying
    }
    return Math.min(times * 200, 3000); // Exponential backoff, max 3s
  },
  reconnectOnError(err: Error): boolean {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
    return targetErrors.some((e) => err.message.includes(e));
  },
};

/**
 * Redis key prefixes for namespacing
 */
export const RedisKeys = {
  // Auth
  refreshTokenFamily: (familyId: string) => `rt:family:${familyId}`,
  rateLimitAuth: (ip: string) => `rl:auth:${ip}`,
  rateLimitGlobal: (ip: string) => `rl:global:${ip}`,

  // Sessions
  session: (sessionId: string) => `session:${sessionId}`,
  userSessions: (userId: string) => `user:sessions:${userId}`,

  // Cache
  userCache: (userId: string) => `cache:user:${userId}`,
  orgCache: (orgId: string) => `cache:org:${orgId}`,
  policyCache: (policyId: string) => `cache:policy:${policyId}`,

  // Devices
  deviceOnline: (deviceId: string) => `device:online:${deviceId}`,
  deviceCommands: (deviceId: string) => `device:commands:${deviceId}`,
  agentHeartbeat: (deviceId: string) => `agent:heartbeat:${deviceId}`,

  // Queues
  emailQueue: 'queue:email',
  notificationQueue: 'queue:notifications',
  webhookQueue: 'queue:webhooks',
  reportQueue: 'queue:reports',

  // Feature flags
  featureFlags: (tenantId: string) => `flags:${tenantId}`,
} as const;

/**
 * TTLs in seconds
 */
export const RedisTTL = {
  userCache: 300,       // 5 minutes
  orgCache: 600,        // 10 minutes
  policyCache: 120,     // 2 minutes
  session: 604800,      // 7 days
  agentHeartbeat: 90,   // 90 seconds (device considered offline if missed)
  featureFlags: 60,     // 1 minute
} as const;
