import type { PrismaClient } from '@prisma/client';
import type { IRoleRepository } from '../../domain/repositories/IRoleRepository';
import { RoleEntity } from '../../domain/entities/Role.entity';
import { PermissionEntity } from '../../domain/entities/Permission.entity';

type PrismaRoleWithPermissions = {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  isSystem: boolean;
  isDefault: boolean;
  priority: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  permissions: Array<{
    permission: {
      id: string;
      key: string;
      description: string | null;
      createdAt: Date;
    };
  }>;
};

export class PrismaRoleRepository implements IRoleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(record: PrismaRoleWithPermissions): RoleEntity {
    return RoleEntity.reconstitute({
      id: record.id,
      organizationId: record.organizationId,
      name: record.name,
      description: record.description,
      isSystem: record.isSystem,
      isDefault: record.isDefault,
      priority: record.priority,
      version: record.version,
      permissions: record.permissions.map((rp) =>
        PermissionEntity.reconstitute({
          id: rp.permission.id,
          key: rp.permission.key,
          description: rp.permission.description,
          createdAt: rp.permission.createdAt,
        }),
      ),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }

  private readonly includePermissions = {
    permissions: {
      include: { permission: true },
    },
  } as const;

  async findById(id: string): Promise<RoleEntity | null> {
    const record = await this.prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: this.includePermissions,
    });
    return record ? this.toDomain(record) : null;
  }

  async findByName(name: string, organizationId?: string | null): Promise<RoleEntity | null> {
    const record = await this.prisma.role.findFirst({
      where: {
        name,
        organizationId: organizationId ?? null,
        deletedAt: null,
      },
      include: this.includePermissions,
    });
    return record ? this.toDomain(record) : null;
  }

  async findDefaultForOrganization(organizationId: string): Promise<RoleEntity | null> {
    const record = await this.prisma.role.findFirst({
      where: { organizationId, isDefault: true, deletedAt: null },
      include: this.includePermissions,
      orderBy: { priority: 'desc' },
    });
    return record ? this.toDomain(record) : null;
  }

  async findSystemRole(name: string): Promise<RoleEntity | null> {
    const record = await this.prisma.role.findFirst({
      where: { name, isSystem: true, organizationId: null, deletedAt: null },
      include: this.includePermissions,
    });
    return record ? this.toDomain(record) : null;
  }

  async getPermissionsForUser(userId: string): Promise<string[]> {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId, isActive: true },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    const permissionKeys = new Set<string>();
    for (const membership of memberships) {
      for (const userRole of membership.roles) {
        for (const rp of userRole.role.permissions) {
          permissionKeys.add(rp.permission.key);
        }
      }
    }
    return Array.from(permissionKeys);
  }
}
