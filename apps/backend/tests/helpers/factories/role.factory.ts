import { PrismaClient, type Role, type Permission } from '@prisma/client';

export async function createTestRole(
  prisma: PrismaClient,
  name: string,
  organizationId?: string,
): Promise<Role> {
  return prisma.role.create({
    data: {
      name,
      organizationId: organizationId ?? null,
      isSystem: !organizationId,
      isDefault: false,
      priority: 100,
    },
  });
}

export async function createTestPermission(
  prisma: PrismaClient,
  key: string,
): Promise<Permission> {
  return prisma.permission.create({
    data: { key, description: `Test permission: ${key}` },
  });
}

export async function assignPermissionToRole(
  prisma: PrismaClient,
  roleId: string,
  permissionId: string,
): Promise<void> {
  await prisma.rolePermission.create({
    data: { roleId, permissionId },
  });
}
