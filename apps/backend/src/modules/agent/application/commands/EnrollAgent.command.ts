import { z } from 'zod';
import { DevicePlatform } from '@veyonix/shared-types';

export const enrollAgentSchema = z.object({
  macAddress: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/),
  hostname: z.string().min(1),
  name: z.string().min(1),
  platform: z.nativeEnum(DevicePlatform),
  osVersion: z.string().optional(),
  agentVersion: z.string().optional(),
  organizationId: z.string().uuid(),
  publicKey: z.string().min(32),
});

export type EnrollAgentCommand = z.infer<typeof enrollAgentSchema>;
