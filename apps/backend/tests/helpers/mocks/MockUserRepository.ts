import { vi } from 'vitest';

export function createMockUserRepository() {
  return {
    findById: vi.fn(),
    findByNormalizedEmail: vi.fn(),
    findByOrganization: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    incrementFailedLoginAttempts: vi.fn(),
    resetFailedLoginAttempts: vi.fn(),
  };
}

export type MockUserRepository = ReturnType<typeof createMockUserRepository>;
