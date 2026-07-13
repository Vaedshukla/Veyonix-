import { z } from 'zod';
import { TargetType } from '../../domain/entities/PolicyAssignment.entity';

export const CreatePolicySchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  payload: z.record(z.any()),
  createdBy: z.string()
});

export type CreatePolicyDTO = z.infer<typeof CreatePolicySchema>;

export const UpdatePolicySchema = z.object({
  policyId: z.string(),
  payload: z.record(z.any()),
  updatedBy: z.string()
});

export type UpdatePolicyDTO = z.infer<typeof UpdatePolicySchema>;

export const AssignPolicySchema = z.object({
  policyId: z.string(),
  targetType: z.nativeEnum(TargetType),
  targetId: z.string(),
  priority: z.number().int().default(0)
});

export type AssignPolicyDTO = z.infer<typeof AssignPolicySchema>;
