import type { RoleEntity } from '../entities/Role.entity';

export interface IRoleRepository {
  findById(id: string): Promise<RoleEntity | null>;
  findByName(name: string, organizationId?: string | null): Promise<RoleEntity | null>;
  findDefaultForOrganization(organizationId: string): Promise<RoleEntity | null>;
  findSystemRole(name: string): Promise<RoleEntity | null>;
  getPermissionsForUser(userId: string): Promise<string[]>;
}
