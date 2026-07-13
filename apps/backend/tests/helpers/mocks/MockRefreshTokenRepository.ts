import { vi } from 'vitest';

export function createMockRefreshTokenRepository() {
  return {
    create: vi.fn(),
    findByTokenHash: vi.fn(),
    findByFamilyId: vi.fn(),
    markUsed: vi.fn(),
    revoke: vi.fn(),
    revokeFamily: vi.fn(),
  };
}

export type MockRefreshTokenRepository = ReturnType<typeof createMockRefreshTokenRepository>;
