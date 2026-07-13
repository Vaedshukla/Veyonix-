import { z } from 'zod';

export const GenerateEnrollmentTokenSchema = z.object({
  organizationId: z.string().uuid(),
  maxUses: z.number().int().min(1).default(1),
  expiresAt: z.date(),
  createdBy: z.string().uuid(),
});

export type GenerateEnrollmentTokenDTO = z.infer<typeof GenerateEnrollmentTokenSchema>;

export const EnrollDeviceSchema = z.object({
  rawToken: z.string(),
  hostname: z.string(),
  os: z.string(),
  architecture: z.string(),
  agentVersion: z.string(),
});

export type EnrollDeviceDTO = z.infer<typeof EnrollDeviceSchema>;

export const AuthenticateDeviceSchema = z.object({
  deviceId: z.string().uuid(),
  deviceSecret: z.string(),
});

export type AuthenticateDeviceDTO = z.infer<typeof AuthenticateDeviceSchema>;

export const HeartbeatSchema = z.object({
  deviceId: z.string().uuid(),
});

export type HeartbeatDTO = z.infer<typeof HeartbeatSchema>;

export const AssignDeviceSchema = z.object({
  deviceId: z.string().uuid(),
  userId: z.string().uuid(),
  assignedBy: z.string().uuid(),
});

export type AssignDeviceDTO = z.infer<typeof AssignDeviceSchema>;

export const ListDevicesSchema = z.object({
  organizationId: z.string().uuid(),
});

export type ListDevicesDTO = z.infer<typeof ListDevicesSchema>;
