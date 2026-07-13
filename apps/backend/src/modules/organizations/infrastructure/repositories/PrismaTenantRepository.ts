import type { PrismaClient } from '@prisma/client';
import type { ITenantRepository } from '../../domain/repositories/ITenantRepository';
import { TenantEntity } from '../../domain/entities/Tenant.entity';

export class PrismaTenantRepository implements ITenantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(r: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): TenantEntity {
    return TenantEntity.reconstitute({
      id: r.id,
      name: r.name,
      slug: r.slug,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      deletedAt: r.deletedAt,
    });
  }

  async findById(id: string): Promise<TenantEntity | null> {
    const r = await this.prisma.tenant.findFirst({ where: { id, deletedAt: null } });
    return r ? this.toDomain(r) : null;
  }

  async findBySlug(slug: string): Promise<TenantEntity | null> {
    const r = await this.prisma.tenant.findFirst({ where: { slug, deletedAt: null } });
    return r ? this.toDomain(r) : null;
  }

  async create(tenant: TenantEntity): Promise<TenantEntity> {
    const p = tenant.toPlainObject();
    const r = await this.prisma.tenant.create({
      data: {
        id: p.id,
        name: p.name,
        slug: p.slug,
        isActive: p.isActive,
      },
    });
    return this.toDomain(r);
  }

  async update(tenant: TenantEntity): Promise<TenantEntity> {
    const p = tenant.toPlainObject();
    const r = await this.prisma.tenant.update({
      where: { id: p.id },
      data: {
        name: p.name,
        isActive: p.isActive,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(r);
  }
}
