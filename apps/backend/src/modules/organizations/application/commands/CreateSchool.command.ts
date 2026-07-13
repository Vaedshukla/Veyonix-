import { z } from 'zod';

export const createSchoolSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  principalName: z.string().optional(),
  organizationId: z.string().uuid(),
});

export type CreateSchoolCommand = z.infer<typeof createSchoolSchema>;
