import { PrismaClient, OrganizationType, IdentityAuditAction, AuditSource, AuditSeverity } from '@prisma/client';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Veyonix database seed...');

  // 1. Create Base Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'veyonix-system' },
    update: {},
    create: {
      name: 'Veyonix System',
      slug: 'veyonix-system',
    },
  });
  console.log(`✅ Created Base Tenant: ${tenant.name}`);

  // 2. Create Base Organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'veyonix-hq' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Veyonix HQ',
      slug: 'veyonix-hq',
      type: OrganizationType.ENTERPRISE,
    },
  });
  console.log(`✅ Created Base Organization: ${organization.name}`);

  // 3. Define System Permissions
  const permissions = [
    { key: 'users.read', description: 'Can read user profiles' },
    { key: 'users.write', description: 'Can create and modify users' },
    { key: 'users.delete', description: 'Can delete users' },
    { key: 'roles.read', description: 'Can view roles' },
    { key: 'roles.manage', description: 'Can manage roles and permissions' },
    { key: 'organizations.read', description: 'Can view organization details' },
    { key: 'organizations.manage', description: 'Can manage organization settings' },
    { key: 'devices.manage', description: 'Can manage devices' },
  ];

  const createdPermissions = [];
  for (const p of permissions) {
    const perm = await prisma.permission.upsert({
      where: { key: p.key },
      update: { description: p.description },
      create: p,
    });
    createdPermissions.push(perm);
  }
  console.log(`✅ Upserted ${createdPermissions.length} system permissions`);

  // 4. Create Default Roles (System-wide, so organizationId = null)
  let superAdminRole = await prisma.role.findFirst({
    where: { name: 'SUPER_ADMIN', organizationId: null },
  });
  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        name: 'SUPER_ADMIN',
        description: 'System-wide super administrator with unrestricted access',
        isSystem: true,
        isDefault: false,
        priority: 1000,
        organizationId: null,
      },
    });
  }

  let tenantAdminRole = await prisma.role.findFirst({
    where: { name: 'TENANT_ADMIN', organizationId: null },
  });
  if (!tenantAdminRole) {
    tenantAdminRole = await prisma.role.create({
      data: {
        name: 'TENANT_ADMIN',
        description: 'Tenant administrator',
        isSystem: true,
        isDefault: true,
        priority: 900,
        organizationId: null,
      },
    });
  }

  console.log(`✅ Upserted system roles`);

  // 5. Map Permissions to SUPER_ADMIN
  for (const perm of createdPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: perm.id,
      },
    });
  }
  console.log(`✅ Mapped all permissions to SUPER_ADMIN`);

  // 6. Create Initial Admin User
  const adminEmail = 'admin@veyonix.com';
  const adminPassword = 'admin';
  const hashedPassword = await argon2.hash(adminPassword);

  const admin = await prisma.user.upsert({
    where: { normalizedEmail: adminEmail.toLowerCase() },
    update: {},
    create: {
      email: adminEmail,
      normalizedEmail: adminEmail.toLowerCase(),
      firstName: 'System',
      lastName: 'Administrator',
      passwordHash: hashedPassword,
      isActive: true,
      isEmailVerified: true,
    },
  });
  console.log(`✅ Upserted Admin User: ${admin.email}`);

  // 7. Grant Organization Membership
  const membership = await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: organization.id } },
    update: {},
    create: {
      userId: admin.id,
      organizationId: organization.id,
    },
  });

  // 8. Assign SUPER_ADMIN to Admin User
  await prisma.userRole.upsert({
    where: { membershipId_roleId: { membershipId: membership.id, roleId: superAdminRole.id } },
    update: {},
    create: {
      membershipId: membership.id,
      roleId: superAdminRole.id,
    },
  });
  console.log(`✅ Granted SUPER_ADMIN to Admin User in Veyonix HQ`);

  // 9. Log Audit Event
  await prisma.auditLog.create({
    data: {
      action: IdentityAuditAction.USER_CREATED,
      source: AuditSource.SYSTEM,
      severity: AuditSeverity.INFO,
      actorId: admin.id,
      targetId: admin.id,
      organizationId: organization.id,
      details: { message: 'System bootstrap completed' },
    },
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
