import type { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository';
import type { IMembershipRepository } from '../../domain/repositories/IMembershipRepository';
import type { IAuditLogger } from '../../../identity/domain/services/IAuditLogger';
import { OrganizationMembershipEntity } from '../../domain/entities/OrganizationMembership.entity';
import { UserJoinedOrganizationEvent } from '../../domain/events/UserJoinedOrganizationEvent';
import {
  OrganizationNotFoundError,
  OrganizationInactiveError,
  MembershipAlreadyExistsError,
} from '../../domain/errors/OrganizationDomainError';
import type { InviteUserDto, MembershipResultDto } from '../dtos/organization.dto';

export interface InviteUserDeps {
  organizationRepository: IOrganizationRepository;
  membershipRepository: IMembershipRepository;
  auditLogger: IAuditLogger;
}

export interface InviteUserContext {
  actorId: string;
  correlationId?: string | null;
  ipAddress?: string | null;
}

export class InviteUserUseCase {
  constructor(private readonly deps: InviteUserDeps) {}

  async execute(
    dto: InviteUserDto,
    ctx: InviteUserContext,
  ): Promise<{ result: MembershipResultDto; event: UserJoinedOrganizationEvent }> {
    // 1. Validate organization exists and is active
    const org = await this.deps.organizationRepository.findById(dto.organizationId);
    if (!org) throw new OrganizationNotFoundError(dto.organizationId);
    if (!org.isActive) throw new OrganizationInactiveError();

    // 2. Guard against duplicate active memberships
    const existing = await this.deps.membershipRepository.findByUserAndOrganization(
      dto.userId,
      dto.organizationId,
    );
    if (existing?.isActive) throw new MembershipAlreadyExistsError();

    // 3. Create the membership
    const membership = OrganizationMembershipEntity.create({
      userId: dto.userId,
      organizationId: dto.organizationId,
    });
    const saved = await this.deps.membershipRepository.create(membership);

    // 4. Assign initial role if provided
    if (dto.roleId) {
      await this.deps.membershipRepository.assignRole(saved.id, dto.roleId);
    }

    // 5. Emit audit record
    await this.deps.auditLogger.log({
      action: 'ROLE_ASSIGNED',
      actorId: ctx.actorId,
      targetId: dto.userId,
      organizationId: dto.organizationId,
      source: 'WEB',
      severity: 'INFO',
      correlationId: ctx.correlationId,
      ipAddress: ctx.ipAddress,
    });

    const event = new UserJoinedOrganizationEvent(
      dto.userId,
      dto.organizationId,
      saved.id,
      ctx.correlationId,
    );

    const roles = dto.roleId
      ? await this.deps.membershipRepository.getRoles(saved.id)
      : [];

    return {
      result: {
        id: saved.id,
        userId: saved.userId,
        organizationId: saved.organizationId,
        isActive: saved.isActive,
        roles,
        createdAt: saved.createdAt.toISOString(),
      },
      event,
    };
  }
}
