import { vi } from 'vitest';

export function createMockSessionRepository() {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findActiveByUserId: vi.fn(),
    revoke: vi.fn(),
    revokeAllForUser: vi.fn(),
    updateLastActive: vi.fn(),
  };
}

export type MockSessionRepository = ReturnType<typeof createMockSessionRepository>;
