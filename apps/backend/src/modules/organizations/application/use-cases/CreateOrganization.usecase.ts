import type { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository';
import type { ITenantRepository } from '../../domain/repositories/ITenantRepository';
import type { IMembershipRepository } from '../../domain/repositories/IMembershipRepository';
import type { IAuditLogger } from '../../../identity/domain/services/IAuditLogger';
import { OrganizationEntity } from '../../domain/entities/Organization.entity';
import { OrganizationMembershipEntity } from '../../domain/entities/OrganizationMembership.entity';
import { OrganizationCreatedEvent } from '../../domain/events/OrganizationCreatedEvent';
import {
  TenantNotFoundError,
  OrganizationSlugTakenError,
} from '../../domain/errors/OrganizationDomainError';
import type { CreateOrganizationDto, OrganizationResultDto } from '../dtos/organization.dto';

export interface CreateOrganizationDeps {
  organizationRepository: IOrganizationRepository;
  tenantRepository: ITenantRepository;
  membershipRepository: IMembershipRepository;
  auditLogger: IAuditLogger;
}

export interface CreateOrganizationContext {
  actorId: string;
  correlationId?: string | null;
  ipAddress?: string | null;
}

export class CreateOrganizationUseCase {
  constructor(private readonly deps: CreateOrganizationDeps) {}

  async execute(
    dto: CreateOrganizationDto,
    ctx: CreateOrganizationContext,
  ): Promise<{ result: OrganizationResultDto; event: OrganizationCreatedEvent }> {
    // 1. Validate tenant exists and is active
    const tenant = await this.deps.tenantRepository.findById(dto.tenantId);
    if (!tenant || !tenant.isActive) throw new TenantNotFoundError(dto.tenantId);

    // 2. Ensure slug is globally unique
    const existing = await this.deps.organizationRepository.findBySlug(dto.slug);
    if (existing) throw new OrganizationSlugTakenError(dto.slug);

    // 3. Create organization entity
    const org = OrganizationEntity.create({
      tenantId: dto.tenantId,
      name: dto.name,
      slug: dto.slug,
      type: dto.type,
    });
    const savedOrg = await this.deps.organizationRepository.create(org);

    // 4. Auto-enroll the creator as the first member
    const membership = OrganizationMembershipEntity.create({
      userId: ctx.actorId,
      organizationId: savedOrg.id,
    });
    await this.deps.membershipRepository.create(membership);

    // 5. Emit audit record
    await this.deps.auditLogger.log({
      action: 'USER_CREATED', // closest available audit action — extend enum in future
      actorId: ctx.actorId,
      targetId: savedOrg.id,
      organizationId: savedOrg.id,
      source: 'WEB',
      severity: 'INFO',
      correlationId: ctx.correlationId,
      ipAddress: ctx.ipAddress,
      details: { orgName: savedOrg.name, slug: savedOrg.slug },
    });

    const event = new OrganizationCreatedEvent(
      savedOrg.id,
      savedOrg.tenantId,
      savedOrg.name,
      ctx.actorId,
      ctx.correlationId,
    );

    return {
      result: {
        id: savedOrg.id,
        tenantId: savedOrg.tenantId,
        name: savedOrg.name,
        slug: savedOrg.slug,
        type: savedOrg.type,
        isActive: savedOrg.isActive,
        createdAt: savedOrg.createdAt.toISOString(),
      },
      event,
    };
  }
}
