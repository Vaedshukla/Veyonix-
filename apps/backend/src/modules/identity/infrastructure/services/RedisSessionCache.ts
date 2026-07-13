import type Redis from 'ioredis';

/**
 * Redis-backed session validation cache.
 *
 * This cache is the primary validation point on every API request.
 * Checking whether a session is valid hits Redis (< 2ms), avoiding DB queries.
 *
 * Invalidation: When a session is revoked, we delete its Redis key immediately.
 * This ensures instant revocation without waiting for JWT TTL to expire.
 */
export class RedisSessionCache {
  private readonly keyPrefix = 'session:';
  private readonly permKeyPrefix = 'permissions:';

  constructor(private readonly redis: Redis) {}

  private sessionKey(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`;
  }

  private permKey(userId: string): string {
    return `${this.permKeyPrefix}${userId}`;
  }

  async setSessionValid(sessionId: string, userId: string, ttlSeconds: number): Promise<void> {
    await this.redis.setex(this.sessionKey(sessionId), ttlSeconds, userId);
  }

  async isSessionValid(sessionId: string): Promise<boolean> {
    const result = await this.redis.exists(this.sessionKey(sessionId));
    return result === 1;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.redis.del(this.sessionKey(sessionId));
  }

  async invalidateAllUserSessions(userId: string, pattern?: string): Promise<void> {
    // Note: In production at scale, maintain a Set of sessionIds per user
    // to avoid SCAN operations. For now, we invalidate by pattern.
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    if (keys.length > 0) {
      // Filter by userId value
      const pipeline = this.redis.pipeline();
      for (const key of keys) {
        pipeline.get(key);
      }
      const values = await pipeline.exec();
      const toDelete: string[] = [];
      if (values) {
        for (let i = 0; i < values.length; i++) {
          if (values[i]?.[1] === userId) {
            const key = keys[i];
            if (key) toDelete.push(key);
          }
        }
      }
      if (toDelete.length > 0) {
        await this.redis.del(...toDelete);
      }
    }
  }

  // Permission cache with versioned invalidation
  async cachePermissions(
    userId: string,
    permissions: string[],
    version: number,
    ttlSeconds: number,
  ): Promise<void> {
    const payload = JSON.stringify({ permissions, version });
    await this.redis.setex(this.permKey(userId), ttlSeconds, payload);
  }

  async getPermissions(userId: string, requiredVersion?: number): Promise<string[] | null> {
    const raw = await this.redis.get(this.permKey(userId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { permissions: string[]; version: number };
      // If a required version is supplied and the cached version is stale, bust it
      if (requiredVersion !== undefined && parsed.version < requiredVersion) {
        await this.redis.del(this.permKey(userId));
        return null;
      }
      return parsed.permissions;
    } catch {
      return null;
    }
  }

  async invalidatePermissions(userId: string): Promise<void> {
    await this.redis.del(this.permKey(userId));
  }
}
