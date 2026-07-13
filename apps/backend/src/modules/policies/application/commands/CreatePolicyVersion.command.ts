import { z } from 'zod';
import { PolicyAction, RuleType } from '@veyonix/shared-types';

export const createPolicyVersionSchema = z.object({
  changeNotes: z.string().optional(),
  ruleGroups: z.array(z.object({
    name: z.string().min(1),
    operator: z.string().default('AND'),
    rules: z.array(z.object({
      type: z.nativeEnum(RuleType),
      action: z.nativeEnum(PolicyAction),
      target: z.any(), // JSON targets like patterns/app categories
      priority: z.number().int().optional(),
    })),
  })).min(1),
});

export type CreatePolicyVersionCommand = z.infer<typeof createPolicyVersionSchema>;
