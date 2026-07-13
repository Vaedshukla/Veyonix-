import { execSync } from 'node:child_process';
import path from 'node:path';

export async function setup() {
  const backendDir = path.resolve(__dirname, '../..');
  console.log('\n🔧 Syncing test database schema...');
  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: backendDir,
    env: {
      ...process.env,
      DATABASE_URL: process.env['TEST_DATABASE_URL'] ?? process.env['DATABASE_URL'],
    },
    stdio: 'inherit',
  });
  console.log('✅ Test database ready\n');
}

export async function teardown() {
  // No global teardown needed — per-test cleanup handles isolation
}
