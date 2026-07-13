import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InviteUserUseCase } from '../../../src/modules/organizations/application/use-cases/InviteUser.usecase';
import {
  OrganizationNotFoundError,
  OrganizationInactiveError,
  MembershipAlreadyExistsError,
} from '../../../src/modules/organizations/domain/errors/OrganizationDomainError';
import { OrganizationEntity } from '../../../src/modules/organizations/domain/entities/Organization.entity';
import { OrganizationMembershipEntity } from '../../../src/modules/organizations/domain/entities/OrganizationMembership.entity';
import { UserJoinedOrganizationEvent } from '../../../src/modules/organizations/domain/events/UserJoinedOrganizationEvent';

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

function makeMockMembershipRepository() {
  return {
    findById: vi.fn(),
    findByUserAndOrganization: vi.fn(),
    findByOrganization: vi.fn(),
    findByUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    assignRole: vi.fn().mockResolvedValue(undefined),
    removeRole: vi.fn(),
    getRoles: vi.fn().mockResolvedValue([]),
  };
}

function makeMockAuditLogger() {
  return { log: vi.fn().mockResolvedValue(undefined) };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeActiveOrg(
  overrides: Partial<Parameters<typeof OrganizationEntity.reconstitute>[0]> = {},
) {
  return OrganizationEntity.reconstitute({
    id: 'org-uuid-0001',
    tenantId: 'tenant-uuid-0001',
    name: 'Acme District',
    slug: 'acme-district',
    type: 'SCHOOL_DISTRICT',
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });
}

function makeExistingActiveMembership(
  overrides: Partial<Parameters<typeof OrganizationMembershipEntity.reconstitute>[0]> = {},
) {
  return OrganizationMembershipEntity.reconstitute({
    id: 'membership-uuid-existing',
    userId: 'user-uuid-0002',
    organizationId: 'org-uuid-0001',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function makeValidDto(overrides: Partial<{ userId: string; organizationId: string; roleId?: string }> = {}) {
  return {
    userId: 'user-uuid-0002',
    organizationId: 'org-uuid-0001',
    ...overrides,
  };
}

const ctx = { actorId: 'user-uuid-0001', correlationId: 'corr-002', ipAddress: '127.0.0.1' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InviteUserUseCase', () => {
  let organizationRepository: ReturnType<typeof makeMockOrganizationRepository>;
  let membershipRepository: ReturnType<typeof makeMockMembershipRepository>;
  let auditLogger: ReturnType<typeof makeMockAuditLogger>;
  let useCase: InviteUserUseCase;

  beforeEach(() => {
    organizationRepository = makeMockOrganizationRepository();
    membershipRepository = makeMockMembershipRepository();
    auditLogger = makeMockAuditLogger();

    useCase = new InviteUserUseCase({
      organizationRepository,
      membershipRepository,
      auditLogger,
    });
  });

  // -------------------------------------------------------------------------
  it('successfully creates a membership and emits UserJoinedOrganizationEvent', async () => {
    const org = makeActiveOrg();
    organizationRepository.findById.mockResolvedValue(org);
    membershipRepository.findByUserAndOrganization.mockResolvedValue(null);
    membershipRepository.create.mockImplementation(
      async (m: OrganizationMembershipEntity) => m,
    );
    membershipRepository.getRoles.mockResolvedValue([]);

    const dto = makeValidDto();
    const { result, event } = await useCase.execute(dto, ctx);

    // Membership result shape
    expect(result.userId).toBe(dto.userId);
    expect(result.organizationId).toBe(dto.organizationId);
    expect(result.isActive).toBe(true);
    expect(result.roles).toEqual([]);
    expect(result.createdAt).toBeDefined();

    // Domain event
    expect(event).toBeInstanceOf(UserJoinedOrganizationEvent);
    expect(event.eventType).toBe('organizations.membership.created');
    expect(event.userId).toBe(dto.userId);
    expect(event.organizationId).toBe(dto.organizationId);
    expect(event.correlationId).toBe(ctx.correlationId);

    // Membership was persisted
    expect(membershipRepository.create).toHaveBeenCalledOnce();

    // Audit was logged
    expect(auditLogger.log).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------
  it('throws OrganizationNotFoundError when org does not exist', async () => {
    organizationRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(makeValidDto(), ctx)).rejects.toThrow(
      OrganizationNotFoundError,
    );
    expect(membershipRepository.create).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  it('throws OrganizationNotFoundError with correct code and httpStatus', async () => {
    organizationRepository.findById.mockResolvedValue(null);

    try {
      await useCase.execute(makeValidDto(), ctx);
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(OrganizationNotFoundError);
      expect((e as OrganizationNotFoundError).code).toBe('ORG_NOT_FOUND');
      expect((e as OrganizationNotFoundError).httpStatus).toBe(404);
    }
  });

  // -------------------------------------------------------------------------
  it('throws OrganizationInactiveError when org is inactive', async () => {
    const inactiveOrg = makeActiveOrg({ isActive: false });
    organizationRepository.findById.mockResolvedValue(inactiveOrg);

    await expect(useCase.execute(makeValidDto(), ctx)).rejects.toThrow(
      OrganizationInactiveError,
    );
    expect(membershipRepository.create).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  it('throws MembershipAlreadyExistsError when user is already an active member', async () => {
    const org = makeActiveOrg();
    organizationRepository.findById.mockResolvedValue(org);

    const existing = makeExistingActiveMembership({ userId: 'user-uuid-0002' });
    membershipRepository.findByUserAndOrganization.mockResolvedValue(existing);

    await expect(useCase.execute(makeValidDto(), ctx)).rejects.toThrow(
      MembershipAlreadyExistsError,
    );
    expect(membershipRepository.create).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  it('throws MembershipAlreadyExistsError with correct code and httpStatus', async () => {
    const org = makeActiveOrg();
    organizationRepository.findById.mockResolvedValue(org);

    const existing = makeExistingActiveMembership();
    membershipRepository.findByUserAndOrganization.mockResolvedValue(existing);

    try {
      await useCase.execute(makeValidDto(), ctx);
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(MembershipAlreadyExistsError);
      expect((e as MembershipAlreadyExistsError).code).toBe('MEMBERSHIP_ALREADY_EXISTS');
      expect((e as MembershipAlreadyExistsError).httpStatus).toBe(409);
    }
  });

  // -------------------------------------------------------------------------
  it('does NOT throw when an existing membership is inactive (re-invite allowed)', async () => {
    const org = makeActiveOrg();
    organizationRepository.findById.mockResolvedValue(org);

    // Existing membership is inactive — should be allowed through
    const inactiveMembership = makeExistingActiveMembership({ isActive: false });
    membershipRepository.findByUserAndOrganization.mockResolvedValue(inactiveMembership);
    membershipRepository.create.mockImplementation(
      async (m: OrganizationMembershipEntity) => m,
    );

    const dto = makeValidDto();
    const { result } = await useCase.execute(dto, ctx);

    expect(result.isActive).toBe(true);
    expect(membershipRepository.create).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------
  it('assigns a role when roleId is provided', async () => {
    const roleId = 'role-uuid-0001';
    const org = makeActiveOrg();
    organizationRepository.findById.mockResolvedValue(org);
    membershipRepository.findByUserAndOrganization.mockResolvedValue(null);

    let savedMembership!: OrganizationMembershipEntity;
    membershipRepository.create.mockImplementation(
      async (m: OrganizationMembershipEntity) => {
        savedMembership = m;
        return m;
      },
    );

    // Simulate getRoles returning the assigned role after assignRole is called
    membershipRepository.getRoles.mockResolvedValue([
      { roleId, roleName: 'Admin' },
    ]);

    const dto = makeValidDto({ roleId });
    const { result } = await useCase.execute(dto, ctx);

    // assignRole was called with the saved membership id and the provided roleId
    expect(membershipRepository.assignRole).toHaveBeenCalledOnce();
    expect(membershipRepository.assignRole).toHaveBeenCalledWith(
      savedMembership.id,
      roleId,
    );

    // Roles are reflected in the result DTO
    expect(result.roles).toHaveLength(1);
    expect(result.roles[0]!.roleId).toBe(roleId);
    expect(result.roles[0]!.roleName).toBe('Admin');
  });

  // -------------------------------------------------------------------------
  it('does NOT call assignRole when roleId is omitted', async () => {
    const org = makeActiveOrg();
    organizationRepository.findById.mockResolvedValue(org);
    membershipRepository.findByUserAndOrganization.mockResolvedValue(null);
    membershipRepository.create.mockImplementation(
      async (m: OrganizationMembershipEntity) => m,
    );

    await useCase.execute(makeValidDto(), ctx); // no roleId

    expect(membershipRepository.assignRole).not.toHaveBeenCalled();
    expect(membershipRepository.getRoles).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  it('emits event with membershipId matching the created membership', async () => {
    const org = makeActiveOrg();
    organizationRepository.findById.mockResolvedValue(org);
    membershipRepository.findByUserAndOrganization.mockResolvedValue(null);

    let createdId!: string;
    membershipRepository.create.mockImplementation(
      async (m: OrganizationMembershipEntity) => {
        createdId = m.id;
        return m;
      },
    );

    const dto = makeValidDto();
    const { event } = await useCase.execute(dto, ctx);

    expect(event.membershipId).toBe(createdId);
  });
});
