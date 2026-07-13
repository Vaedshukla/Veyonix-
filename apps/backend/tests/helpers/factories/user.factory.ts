import { PrismaClient, type User, type Tenant, type Organization } from '@prisma/client';
import { uuidv7 } from 'uuidv7';
import argon2 from 'argon2';

export interface CreateUserOptions {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
}

export interface CreatedUserBundle {
  tenant: Tenant;
  organization: Organization;
  user: User;
}

export async function createTestUser(
  prisma: PrismaClient,
  overrides: CreateUserOptions = {},
): Promise<CreatedUserBundle> {
  const id = uuidv7();
  const email = overrides.email ?? `user-${id}@test.veyonix.com`;
  const password = overrides.password ?? 'TestPassword123!';
  const passwordHash = await argon2.hash(password);

  const tenant = await prisma.tenant.create({
    data: {
      name: `Test Tenant ${id}`,
      slug: `test-tenant-${id}`,
    },
  });

  const organization = await prisma.organization.create({
    data: {
      tenantId: tenant.id,
      name: `Test Org ${id}`,
      slug: `test-org-${id}`,
      type: 'ENTERPRISE',
    },
  });

  const user = await prisma.user.create({
    data: {
      email,
      normalizedEmail: email.toLowerCase().trim(),
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? 'User',
      passwordHash,
      isEmailVerified: overrides.isEmailVerified ?? true,
      isActive: overrides.isActive ?? true,
    },
  });

  return { tenant, organization, user };
}
