import type { OrganizationMembershipEntity } from '../entities/OrganizationMembership.entity';

export interface IMembershipRepository {
  findById(id: string): Promise<OrganizationMembershipEntity | null>;
  findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationMembershipEntity | null>;
  findByOrganization(
    organizationId: string,
    options?: { isActive?: boolean; limit?: number; cursor?: string },
  ): Promise<OrganizationMembershipEntity[]>;
  findByUser(userId: string): Promise<OrganizationMembershipEntity[]>;
  create(membership: OrganizationMembershipEntity): Promise<OrganizationMembershipEntity>;
  update(membership: OrganizationMembershipEntity): Promise<OrganizationMembershipEntity>;
  assignRole(membershipId: string, roleId: string): Promise<void>;
  removeRole(membershipId: string, roleId: string): Promise<void>;
  getRoles(membershipId: string): Promise<Array<{ roleId: string; roleName: string }>>;
}
