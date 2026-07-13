import { z } from 'zod';

export const CreateOrganizationSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(2).max(200).trim(),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  type: z.enum(['SCHOOL_DISTRICT', 'SCHOOL', 'FAMILY', 'ENTERPRISE']),
});
export type CreateOrganizationDto = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateOrganizationDto = z.infer<typeof UpdateOrganizationSchema>;

export const InviteUserSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  roleId: z.string().uuid().optional(),
});
export type InviteUserDto = z.infer<typeof InviteUserSchema>;

export const AssignRoleSchema = z.object({
  membershipId: z.string().uuid(),
  roleId: z.string().uuid(),
});
export type AssignRoleDto = z.infer<typeof AssignRoleSchema>;

export const ListMembersSchema = z.object({
  organizationId: z.string().uuid(),
  isActive: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
});
export type ListMembersDto = z.infer<typeof ListMembersSchema>;

export interface OrganizationResultDto {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  type: string;
  isActive: boolean;
  createdAt: string;
}

export interface MembershipResultDto {
  id: string;
  userId: string;
  organizationId: string;
  isActive: boolean;
  roles: Array<{ roleId: string; roleName: string }>;
  createdAt: string;
}
