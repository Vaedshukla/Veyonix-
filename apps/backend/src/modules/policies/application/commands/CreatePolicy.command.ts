import { z } from 'zod';
import { PolicyType } from '@veyonix/shared-types';

export const createPolicySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.nativeEnum(PolicyType),
});

export type CreatePolicyCommand = z.infer<typeof createPolicySchema>;
