import { z } from 'zod';
import { CommandType } from '@veyonix/shared-types';

export const issueCommandSchema = z.object({
  deviceId: z.string().uuid(),
  type: z.nativeEnum(CommandType),
  payload: z.any().optional(),
});

export type IssueCommandCommand = z.infer<typeof issueCommandSchema>;
