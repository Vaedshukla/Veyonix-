import type { OrganizationEntity } from '../entities/Organization.entity';

export interface FindOrganizationsOptions {
  tenantId?: string;
  isActive?: boolean;
  limit?: number;
  cursor?: string;
}

export interface IOrganizationRepository {
  findById(id: string, tenantId?: string): Promise<OrganizationEntity | null>;
  findBySlug(slug: string): Promise<OrganizationEntity | null>;
  findMany(options: FindOrganizationsOptions): Promise<OrganizationEntity[]>;
  create(organization: OrganizationEntity): Promise<OrganizationEntity>;
  update(organization: OrganizationEntity): Promise<OrganizationEntity>;
  softDelete(id: string): Promise<void>;
}
