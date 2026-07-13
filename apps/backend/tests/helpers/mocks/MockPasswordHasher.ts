import { vi } from 'vitest';

export function createMockPasswordHasher() {
  return {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    verify: vi.fn().mockResolvedValue(true),
  };
}

export type MockPasswordHasher = ReturnType<typeof createMockPasswordHasher>;
