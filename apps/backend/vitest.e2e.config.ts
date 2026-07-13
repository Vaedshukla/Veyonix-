import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/api/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    globalSetup: ['./tests/integration/global-setup.ts'],
    setupFiles: ['./tests/api/setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@modules': path.resolve(__dirname, 'src/modules'),
    },
  },
});
