export interface CompiledPolicy {
  deviceId: string;
  payload: Record<string, any>;
  hash: string;
  compiledAt: Date;
}
