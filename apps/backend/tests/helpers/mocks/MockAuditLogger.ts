import { vi } from 'vitest';

export function createMockAuditLogger() {
  return {
    log: vi.fn().mockResolvedValue(undefined),
  };
}

export type MockAuditLogger = ReturnType<typeof createMockAuditLogger>;
