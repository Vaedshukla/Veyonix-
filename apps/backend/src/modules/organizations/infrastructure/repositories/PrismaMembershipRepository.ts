import type { PrismaClient } from '@prisma/client';
import type { IMembershipRepository } from '../../domain/repositories/IMembershipRepository';
import { OrganizationMembershipEntity } from '../../domain/entities/OrganizationMembership.entity';

type PrismaMembership = {
  id: string;
  userId: string;
  organizationId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaMembershipRepository implements IMembershipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(r: PrismaMembership): OrganizationMembershipEntity {
    return OrganizationMembershipEntity.reconstitute({
      id: r.id,
      userId: r.userId,
      organizationId: r.organizationId,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  }

  async findById(id: string): Promise<OrganizationMembershipEntity | null> {
    const r = await this.prisma.organizationMembership.findUnique({ where: { id } });
    return r ? this.toDomain(r) : null;
  }

  async findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationMembershipEntity | null> {
    const r = await this.prisma.organizationMembership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    return r ? this.toDomain(r) : null;
  }

  async findByOrganization(
    organizationId: string,
    options?: { isActive?: boolean; limit?: number; cursor?: string },
  ): Promise<OrganizationMembershipEntity[]> {
    const records = await this.prisma.organizationMembership.findMany({
      where: {
        organizationId,
        ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}),
      },
      take: options?.limit ?? 20,
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'asc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByUser(userId: string): Promise<OrganizationMembershipEntity[]> {
    const records = await this.prisma.organizationMembership.findMany({
      where: { userId, isActive: true },
    });
    return records.map((r) => this.toDomain(r));
  }

  async create(membership: OrganizationMembershipEntity): Promise<OrganizationMembershipEntity> {
    const p = membership.toPlainObject();
    const r = await this.prisma.organizationMembership.create({
      data: {
        id: p.id,
        userId: p.userId,
        organizationId: p.organizationId,
        isActive: p.isActive,
      },
    });
    return this.toDomain(r);
  }

  async update(membership: OrganizationMembershipEntity): Promise<OrganizationMembershipEntity> {
    const p = membership.toPlainObject();
    const r = await this.prisma.organizationMembership.update({
      where: { id: p.id },
      data: {
        isActive: p.isActive,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(r);
  }

  async assignRole(membershipId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.upsert({
      where: { membershipId_roleId: { membershipId, roleId } },
      create: { membershipId, roleId },
      update: {},
    });
  }

  async removeRole(membershipId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.deleteMany({ where: { membershipId, roleId } });
  }

  async getRoles(membershipId: string): Promise<Array<{ roleId: string; roleName: string }>> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { membershipId },
      include: { role: { select: { id: true, name: true } } },
    });
    return userRoles.map((ur) => ({ roleId: ur.role.id, roleName: ur.role.name }));
  }
}
