import { z } from 'zod';

export const processHeartbeatSchema = z.object({
  cpuPercent: z.number().min(0).max(100).optional(),
  memoryMb: z.number().positive().optional(),
  diskFreeGb: z.number().nonnegative().optional(),
  activeProcesses: z.array(z.string()).optional(),
  payload: z.any().optional(),
});

export type ProcessHeartbeatCommand = z.infer<typeof processHeartbeatSchema>;
