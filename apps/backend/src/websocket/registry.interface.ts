export interface ConnectionRegistry {
  registerAgent(deviceId: string, orgId: string, nodeAddress: string): Promise<void>;
  unregisterAgent(deviceId: string): Promise<void>;
  getAgentNode(deviceId: string): Promise<string | null>;
  isLocal(deviceId: string): Promise<boolean>;
}
