import type { PrismaClient } from '@prisma/client';
import type {
  OrganizationsRepository,
  TenantEntity,
  OrganizationEntity,
  SchoolEntity,
  ClassroomEntity,
} from '../../domain/repositories/organizations.repository';
import type { OrganizationType } from '@veyonix/shared-types';

export class PrismaOrganizationsRepository implements OrganizationsRepository {
  private readonly prisma: PrismaClient;

  constructor(dependencies: { prisma: PrismaClient }) {
    this.prisma = dependencies.prisma;
  }

  async createTenant(tenant: { id: string; name: string; slug: string }): Promise<TenantEntity> {
    const created = await this.prisma.tenant.create({
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        isActive: true,
      },
    });
    return {
      id: created.id,
      name: created.name,
      slug: created.slug,
      isActive: created.isActive,
      createdAt: created.createdAt,
    };
  }

  async createOrganization(org: {
    id: string;
    tenantId: string;
    name: string;
    slug: string;
    type: string;
  }): Promise<OrganizationEntity> {
    const created = await this.prisma.organization.create({
      data: {
        id: org.id,
        tenantId: org.tenantId,
        name: org.name,
        slug: org.slug,
        type: org.type as OrganizationType,
        isActive: true,
      },
    });
    return {
      id: created.id,
      tenantId: created.tenantId,
      name: created.name,
      slug: created.slug,
      type: created.type,
      isActive: created.isActive,
      createdAt: created.createdAt,
    };
  }

  async findTenantById(id: string): Promise<TenantEntity | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });
    if (!tenant) return null;
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
    };
  }

  async findOrganizationById(id: string): Promise<OrganizationEntity | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!org) return null;
    return {
      id: org.id,
      tenantId: org.tenantId,
      name: org.name,
      slug: org.slug,
      type: org.type,
      isActive: org.isActive,
      createdAt: org.createdAt,
    };
  }

  async findOrganizationBySlug(slug: string): Promise<OrganizationEntity | null> {
    const org = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (!org) return null;
    return {
      id: org.id,
      tenantId: org.tenantId,
      name: org.name,
      slug: org.slug,
      type: org.type,
      isActive: org.isActive,
      createdAt: org.createdAt,
    };
  }

  async createSchool(school: {
    id: string;
    organizationId: string;
    name: string;
    address?: string;
    phone?: string;
    principalName?: string;
  }): Promise<SchoolEntity> {
    const created = await this.prisma.school.create({
      data: {
        id: school.id,
        organizationId: school.organizationId,
        name: school.name,
        address: school.address ?? null,
        phone: school.phone ?? null,
        principalName: school.principalName ?? null,
        isActive: true,
      },
    });
    return {
      id: created.id,
      organizationId: created.organizationId,
      name: created.name,
      address: created.address,
      phone: created.phone,
      principalName: created.principalName,
      isActive: created.isActive,
      createdAt: created.createdAt,
    };
  }

  async createClassroom(classroom: {
    id: string;
    schoolId: string;
    name: string;
    grade?: string;
    subject?: string;
    teacherId?: string;
  }): Promise<ClassroomEntity> {
    const created = await this.prisma.classroom.create({
      data: {
        id: classroom.id,
        schoolId: classroom.schoolId,
        name: classroom.name,
        grade: classroom.grade ?? null,
        subject: classroom.subject ?? null,
        teacherId: classroom.teacherId ?? null,
      },
    });
    return {
      id: created.id,
      schoolId: created.schoolId,
      name: created.name,
      grade: created.grade,
      subject: created.subject,
      teacherId: created.teacherId,
      createdAt: created.createdAt,
    };
  }

  async findSchoolById(id: string): Promise<SchoolEntity | null> {
    const school = await this.prisma.school.findUnique({
      where: { id },
    });
    if (!school) return null;
    return {
      id: school.id,
      organizationId: school.organizationId,
      name: school.name,
      address: school.address,
      phone: school.phone,
      principalName: school.principalName,
      isActive: school.isActive,
      createdAt: school.createdAt,
    };
  }

  async listSchoolsByOrg(orgId: string): Promise<SchoolEntity[]> {
    const schools = await this.prisma.school.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
    return schools.map((s) => ({
      id: s.id,
      organizationId: s.organizationId,
      name: s.name,
      address: s.address,
      phone: s.phone,
      principalName: s.principalName,
      isActive: s.isActive,
      createdAt: s.createdAt,
    }));
  }
}
