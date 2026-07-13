import type { TenantEntity } from '../entities/Tenant.entity';

export interface ITenantRepository {
  findById(id: string): Promise<TenantEntity | null>;
  findBySlug(slug: string): Promise<TenantEntity | null>;
  create(tenant: TenantEntity): Promise<TenantEntity>;
  update(tenant: TenantEntity): Promise<TenantEntity>;
}
