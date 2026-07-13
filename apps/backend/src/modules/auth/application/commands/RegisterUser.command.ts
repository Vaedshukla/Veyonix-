import { z } from 'zod';
import { UserRole, OrganizationType } from '@veyonix/shared-types';

export const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organizationName: z.string().min(1),
  organizationType: z.nativeEnum(OrganizationType).default(OrganizationType.FAMILY),
  role: z.nativeEnum(UserRole).default(UserRole.PARENT),
});

export type RegisterUserCommand = z.infer<typeof registerUserSchema>;
