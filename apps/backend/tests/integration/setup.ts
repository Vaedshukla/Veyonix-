import { beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env['TEST_DATABASE_URL'] ?? process.env['DATABASE_URL'],
    },
  },
});

export { prisma };

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Truncate in reverse dependency order to respect FK constraints
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.userRole.deleteMany(),
    prisma.organizationMembership.deleteMany(),
    prisma.passwordReset.deleteMany(),
    prisma.emailVerification.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.session.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.role.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
    prisma.tenant.deleteMany(),
  ]);
});
