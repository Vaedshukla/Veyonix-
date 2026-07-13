import { ConnectionRegistry } from './registry.interface';

export class MemoryConnectionRegistry implements ConnectionRegistry {
  private readonly agents = new Map<string, { orgId: string; nodeAddress: string }>();

  async registerAgent(deviceId: string, orgId: string, nodeAddress: string): Promise<void> {
    this.agents.set(deviceId, { orgId, nodeAddress });
  }

  async unregisterAgent(deviceId: string): Promise<void> {
    this.agents.delete(deviceId);
  }

  async getAgentNode(deviceId: string): Promise<string | null> {
    const agent = this.agents.get(deviceId);
    return agent ? agent.nodeAddress : null;
  }

  async isLocal(deviceId: string): Promise<boolean> {
    return this.agents.has(deviceId);
  }
}
