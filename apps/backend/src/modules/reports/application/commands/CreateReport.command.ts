import { z } from 'zod';

export const createReportSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['usage', 'compliance', 'activity', 'alert_summary']),
  parameters: z.any().default({}),
  scheduleCron: z.string().optional(),
});

export type CreateReportCommand = z.infer<typeof createReportSchema>;
