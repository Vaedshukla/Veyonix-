import { vi } from 'vitest';
import { uuidv7 } from 'uuidv7';

export function createMockTokenService() {
  return {
    generateAccessToken: vi.fn().mockReturnValue('mock.access.token'),
    generateRefreshToken: vi.fn().mockReturnValue(uuidv7()),
    verifyAccessToken: vi.fn().mockReturnValue({ sub: 'user-id', sessionId: 'session-id', role: 'STUDENT' }),
    hashToken: vi.fn().mockImplementation((token: string) => `hash_${token}`),
  };
}

export type MockTokenService = ReturnType<typeof createMockTokenService>;
