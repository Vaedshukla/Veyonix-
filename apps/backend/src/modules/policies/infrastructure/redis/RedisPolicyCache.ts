import Redis from 'ioredis';
import { CompiledPolicy } from '@prisma/client';

export class RedisPolicyCache {
  private readonly PREFIX = 'policy:compiled:';
  private readonly TTL_SECONDS = 3600; // 1 hour

  constructor(private readonly redis: Redis) {}

  async setCompiledPolicy(deviceId: string, policy: CompiledPolicy): Promise<void> {
    await this.redis.setex(
      `${this.PREFIX}${deviceId}`,
      this.TTL_SECONDS,
      JSON.stringify(policy)
    );
  }

  async getCompiledPolicy(deviceId: string): Promise<CompiledPolicy | null> {
    const data = await this.redis.get(`${this.PREFIX}${deviceId}`);
    return data ? JSON.parse(data) : null;
  }

  async invalidate(deviceId: string): Promise<void> {
    await this.redis.del(`${this.PREFIX}${deviceId}`);
  }
}
