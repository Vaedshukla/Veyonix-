import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateOrganizationUseCase } from '../../../src/modules/organizations/application/use-cases/CreateOrganization.usecase';
import { TenantNotFoundError, OrganizationSlugTakenError } from '../../../src/modules/organizations/domain/errors/OrganizationDomainError';
import { TenantEntity } from '../../../src/modules/organizations/domain/entities/Tenant.entity';
import { OrganizationEntity } from '../../../src/modules/organizations/domain/entities/Organization.entity';
import { OrganizationMembershipEntity } from '../../../src/modules/organizations/domain/entities/OrganizationMembership.entity';
import { OrganizationCreatedEvent } from '../../../src/modules/organizations/domain/events/OrganizationCreatedEvent';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function makeMockOrganizationRepository() {
  return {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  };
}

function makeMockTenantRepository() {
  return {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
}

function makeMockMembershipRepository() {
  return {
    findById: vi.fn(),
    findByUserAndOrganization: vi.fn(),
    findByOrganization: vi.fn(),
    findByUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    assignRole: vi.fn(),
    removeRole: vi.fn(),
    getRoles: vi.fn(),
  };
}

function makeMockAuditLogger() {
  return { log: vi.fn().mockResolvedValue(undefined) };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeActiveTenant(overrides: Partial<Parameters<typeof TenantEntity.reconstitute>[0]> = {}) {
  return TenantEntity.reconstitute({
    id: 'tenant-uuid-0001',
    name: 'Acme Schools',
    slug: 'acme-schools',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });
}

function makeValidDto() {
  return {
    tenantId: 'tenant-uuid-0001',
    name: 'Acme District',
    slug: 'acme-district',
    type: 'SCHOOL_DISTRICT' as const,
  };
}

const ctx = { actorId: 'user-uuid-0001', correlationId: 'corr-001', ipAddress: '127.0.0.1' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CreateOrganizationUseCase', () => {
  let organizationRepository: ReturnType<typeof makeMockOrganizationRepository>;
  let tenantRepository: ReturnType<typeof makeMockTenantRepository>;
  let membershipRepository: ReturnType<typeof makeMockMembershipRepository>;
  let auditLogger: ReturnType<typeof makeMockAuditLogger>;
  let useCase: CreateOrganizationUseCase;

  beforeEach(() => {
    organizationRepository = makeMockOrganizationRepository();
    tenantRepository = makeMockTenantRepository();
    membershipRepository = makeMockMembershipRepository();
    auditLogger = makeMockAuditLogger();

    useCase = new CreateOrganizationUseCase({
      organizationRepository,
      tenantRepository,
      membershipRepository,
      auditLogger,
    });
  });

  // -------------------------------------------------------------------------
  it('successfully creates an organization, auto-enrolls creator, and emits event', async () => {
    const tenant = makeActiveTenant();
    tenantRepository.findById.mockResolvedValue(tenant);
    organizationRepository.findBySlug.mockResolvedValue(null);

    // Simulate the saved org being returned from the repository
    organizationRepository.create.mockImplementation(async (org: OrganizationEntity) => org);
    membershipRepository.create.mockImplementation(
      async (m: OrganizationMembershipEntity) => m,
    );

    const dto = makeValidDto();
    const { result, event } = await useCase.execute(dto, ctx);

    // Result shape
    expect(result.tenantId).toBe(dto.tenantId);
    expect(result.name).toBe(dto.name);
    expect(result.slug).toBe(dto.slug);
    expect(result.type).toBe(dto.type);
    expect(result.isActive).toBe(true);
    expect(result.createdAt).toBeDefined();

    // Membership auto-enrollment
    expect(membershipRepository.create).toHaveBeenCalledOnce();
    const [createdMembership] = membershipRepository.create.mock.calls[0] as [OrganizationMembershipEntity];
    expect(createdMembership.userId).toBe(ctx.actorId);
    expect(createdMembership.isActive).toBe(true);

    // Domain event
    expect(event).toBeInstanceOf(OrganizationCreatedEvent);
    expect(event.eventType).toBe('organizations.organization.created');
    expect(event.tenantId).toBe(dto.tenantId);
    expect(event.name).toBe(dto.name);
    expect(event.createdByUserId).toBe(ctx.actorId);
    expect(event.correlationId).toBe(ctx.correlationId);

    // Audit called
    expect(auditLogger.log).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------
  it('throws TenantNotFoundError when tenant does not exist', async () => {
    tenantRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(makeValidDto(), ctx)).rejects.toThrow(TenantNotFoundError);
    expect(organizationRepository.create).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  it('throws TenantNotFoundError when tenant is inactive', async () => {
    const inactiveTenant = makeActiveTenant({ isActive: false });
    tenantRepository.findById.mockResolvedValue(inactiveTenant);

    await expect(useCase.execute(makeValidDto(), ctx)).rejects.toThrow(TenantNotFoundError);
    expect(organizationRepository.create).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  it('throws OrganizationSlugTakenError if slug is already in use', async () => {
    const tenant = makeActiveTenant();
    tenantRepository.findById.mockResolvedValue(tenant);

    // Existing org already occupies this slug
    const existingOrg = OrganizationEntity.reconstitute({
      id: 'org-existing',
      tenantId: 'tenant-uuid-0001',
      name: 'Old Org',
      slug: 'acme-district',
      type: 'SCHOOL',
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    organizationRepository.findBySlug.mockResolvedValue(existingOrg);

    await expect(useCase.execute(makeValidDto(), ctx)).rejects.toThrow(OrganizationSlugTakenError);
    expect(organizationRepository.create).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  it('error code is ORG_SLUG_TAKEN and httpStatus is 409', async () => {
    const tenant = makeActiveTenant();
    tenantRepository.findById.mockResolvedValue(tenant);
    organizationRepository.findBySlug.mockResolvedValue(
      OrganizationEntity.reconstitute({
        id: 'x',
        tenantId: 'tenant-uuid-0001',
        name: 'x',
        slug: 'acme-district',
        type: 'SCHOOL',
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }),
    );

    try {
      await useCase.execute(makeValidDto(), ctx);
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(OrganizationSlugTakenError);
      expect((e as OrganizationSlugTakenError).code).toBe('ORG_SLUG_TAKEN');
      expect((e as OrganizationSlugTakenError).httpStatus).toBe(409);
    }
  });

  // -------------------------------------------------------------------------
  it('error code is TENANT_NOT_FOUND and httpStatus is 404', async () => {
    tenantRepository.findById.mockResolvedValue(null);

    try {
      await useCase.execute(makeValidDto(), ctx);
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(TenantNotFoundError);
      expect((e as TenantNotFoundError).code).toBe('TENANT_NOT_FOUND');
      expect((e as TenantNotFoundError).httpStatus).toBe(404);
    }
  });
});
