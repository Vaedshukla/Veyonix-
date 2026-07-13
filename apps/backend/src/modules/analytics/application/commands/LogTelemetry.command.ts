import { z } from 'zod';
import { PolicyAction } from '@veyonix/shared-types';

export const logTelemetrySchema = z.object({
  visits: z.array(z.object({
    url: z.string().url(),
    domain: z.string(),
    title: z.string().optional(),
    category: z.string().optional(),
    durationMs: z.number().int().optional(),
    action: z.nativeEnum(PolicyAction),
    visitedAt: z.coerce.date(),
  })).default([]),
  
  appUsages: z.array(z.object({
    appName: z.string().min(1),
    bundleId: z.string().optional(),
    durationMs: z.number().int(),
    startedAt: z.coerce.date(),
    endedAt: z.coerce.date().optional(),
    isBlocked: z.boolean(),
  })).default([]),
});

export type LogTelemetryCommand = z.infer<typeof logTelemetrySchema>;
