import type { IMembershipRepository } from '../../domain/repositories/IMembershipRepository';
import type { IRoleRepository } from '../../../identity/domain/repositories/IRoleRepository';
import type { IAuditLogger } from '../../../identity/domain/services/IAuditLogger';
import {
  MembershipNotFoundError,
  RoleNotFoundError,
} from '../../domain/errors/OrganizationDomainError';

export interface AssignRoleDeps {
  membershipRepository: IMembershipRepository;
  roleRepository: IRoleRepository;
  auditLogger: IAuditLogger;
}

export interface AssignRoleContext {
  actorId: string;
  organizationId: string;
  correlationId?: string | null;
  ipAddress?: string | null;
}

export class AssignRoleUseCase {
  constructor(private readonly deps: AssignRoleDeps) {}

  async execute(membershipId: string, roleId: string, ctx: AssignRoleContext): Promise<void> {
    // 1. Validate membership exists and is active
    const membership = await this.deps.membershipRepository.findById(membershipId);
    if (!membership || !membership.isActive) throw new MembershipNotFoundError();

    // 2. Validate the role exists in the system
    const role = await this.deps.roleRepository.findById(roleId);
    if (!role) throw new RoleNotFoundError();

    // 3. Assign the role
    await this.deps.membershipRepository.assignRole(membershipId, roleId);

    // 4. Emit audit record
    await this.deps.auditLogger.log({
      action: 'ROLE_ASSIGNED',
      actorId: ctx.actorId,
      targetId: membership.userId,
      organizationId: ctx.organizationId,
      source: 'WEB',
      severity: 'INFO',
      correlationId: ctx.correlationId,
      details: { roleId, roleName: role.name },
    });
  }
}
