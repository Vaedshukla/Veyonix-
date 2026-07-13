import type { PrismaClient } from '@prisma/client';
import type {
  IOrganizationRepository,
  FindOrganizationsOptions,
} from '../../domain/repositories/IOrganizationRepository';
import { OrganizationEntity } from '../../domain/entities/Organization.entity';
import type { OrganizationType } from '../../domain/entities/Organization.entity';

type PrismaOrg = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  type: string;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export class PrismaOrganizationRepository implements IOrganizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(r: PrismaOrg): OrganizationEntity {
    return OrganizationEntity.reconstitute({
      id: r.id,
      tenantId: r.tenantId,
      name: r.name,
      slug: r.slug,
      type: r.type as OrganizationType,
      isActive: r.isActive,
      version: r.version,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      deletedAt: r.deletedAt,
    });
  }

  async findById(id: string, tenantId?: string): Promise<OrganizationEntity | null> {
    const r = await this.prisma.organization.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(tenantId ? { tenantId } : {}),
      },
    });
    return r ? this.toDomain(r) : null;
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    const r = await this.prisma.organization.findFirst({ where: { slug, deletedAt: null } });
    return r ? this.toDomain(r) : null;
  }

  async findMany(options: FindOrganizationsOptions): Promise<OrganizationEntity[]> {
    const records = await this.prisma.organization.findMany({
      where: {
        deletedAt: null,
        ...(options.tenantId ? { tenantId: options.tenantId } : {}),
        ...(options.isActive !== undefined ? { isActive: options.isActive } : {}),
      },
      take: options.limit ?? 20,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async create(org: OrganizationEntity): Promise<OrganizationEntity> {
    const p = org.toPlainObject();
    const r = await this.prisma.organization.create({
      data: {
        id: p.id,
        tenantId: p.tenantId,
        name: p.name,
        slug: p.slug,
        type: p.type,
        isActive: p.isActive,
        version: p.version,
      },
    });
    return this.toDomain(r);
  }

  async update(org: OrganizationEntity): Promise<OrganizationEntity> {
    const p = org.toPlainObject();
    const r = await this.prisma.organization.update({
      where: { id: p.id },
      data: {
        name: p.name,
        isActive: p.isActive,
        version: p.version,
        updatedAt: new Date(),
        deletedAt: p.deletedAt,
      },
    });
    return this.toDomain(r);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }
}
