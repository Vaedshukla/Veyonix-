import type { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository';
import type { IAuditLogger } from '../../../identity/domain/services/IAuditLogger';
import { OrganizationNotFoundError } from '../../domain/errors/OrganizationDomainError';
import type { UpdateOrganizationDto, OrganizationResultDto } from '../dtos/organization.dto';

export interface UpdateOrganizationDeps {
  organizationRepository: IOrganizationRepository;
  auditLogger: IAuditLogger;
}

export interface UpdateOrganizationContext {
  actorId: string;
  tenantId?: string;
  correlationId?: string | null;
  ipAddress?: string | null;
}

export class UpdateOrganizationUseCase {
  constructor(private readonly deps: UpdateOrganizationDeps) {}

  async execute(
    orgId: string,
    dto: UpdateOrganizationDto,
    ctx: UpdateOrganizationContext,
  ): Promise<OrganizationResultDto> {
    // 1. Load the organization (optionally scoped to a tenant)
    const org = await this.deps.organizationRepository.findById(orgId, ctx.tenantId);
    if (!org) throw new OrganizationNotFoundError(orgId);

    // 2. Apply mutations via entity method (bumps version + updatedAt)
    org.update(dto);
    const updated = await this.deps.organizationRepository.update(org);

    // 3. Emit audit record
    await this.deps.auditLogger.log({
      action: 'USER_UPDATED',
      actorId: ctx.actorId,
      targetId: updated.id,
      organizationId: updated.id,
      source: 'WEB',
      severity: 'INFO',
      correlationId: ctx.correlationId,
      details: dto,
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      slug: updated.slug,
      type: updated.type,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
