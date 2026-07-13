import type Redis from 'ioredis';

import { ConnectionRegistry } from './registry.interface';
import { env } from '@config/index';

export class RedisConnectionRegistry implements ConnectionRegistry {
  private readonly redis: Redis;
  private readonly hashKey = 'active_connections';
  private readonly currentNodeAddress: string;

  constructor(dependencies: { redis: Redis }) {
    this.redis = dependencies.redis;
    // currentNodeAddress resolves to host:port or server IP for cluster identification
    this.currentNodeAddress = `${env.APP_HOST}:${env.APP_PORT}`;
  }

  async registerAgent(deviceId: string, orgId: string, nodeAddress: string): Promise<void> {
    await this.redis.hset(this.hashKey, deviceId, JSON.stringify({ orgId, nodeAddress }));
  }

  async unregisterAgent(deviceId: string): Promise<void> {
    await this.redis.hdel(this.hashKey, deviceId);
  }

  async getAgentNode(deviceId: string): Promise<string | null> {
    const raw = await this.redis.hget(this.hashKey, deviceId);
    if (!raw) return null;
    const data = JSON.parse(raw) as { orgId: string; nodeAddress: string };
    return data.nodeAddress;
  }

  async isLocal(deviceId: string): Promise<boolean> {
    const node = await this.getAgentNode(deviceId);
    return node === this.currentNodeAddress;
  }
}
