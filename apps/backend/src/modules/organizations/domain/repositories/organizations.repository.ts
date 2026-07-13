export interface TenantEntity {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
}

export interface OrganizationEntity {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  type: string;
  isActive: boolean;
  createdAt: Date;
}

export interface SchoolEntity {
  id: string;
  organizationId: string;
  name: string;
  address: string | null;
  phone: string | null;
  principalName: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface ClassroomEntity {
  id: string;
  schoolId: string;
  name: string;
  grade: string | null;
  subject: string | null;
  teacherId: string | null;
  createdAt: Date;
}

export interface OrganizationsRepository {
  createTenant(tenant: { id: string; name: string; slug: string }): Promise<TenantEntity>;
  createOrganization(org: {
    id: string;
    tenantId: string;
    name: string;
    slug: string;
    type: string;
  }): Promise<OrganizationEntity>;
  findTenantById(id: string): Promise<TenantEntity | null>;
  findOrganizationById(id: string): Promise<OrganizationEntity | null>;
  findOrganizationBySlug(slug: string): Promise<OrganizationEntity | null>;
  
  createSchool(school: {
    id: string;
    organizationId: string;
    name: string;
    address?: string;
    phone?: string;
    principalName?: string;
  }): Promise<SchoolEntity>;
  
  createClassroom(classroom: {
    id: string;
    schoolId: string;
    name: string;
    grade?: string;
    subject?: string;
    teacherId?: string;
  }): Promise<ClassroomEntity>;

  findSchoolById(id: string): Promise<SchoolEntity | null>;
  listSchoolsByOrg(orgId: string): Promise<SchoolEntity[]>;
}
