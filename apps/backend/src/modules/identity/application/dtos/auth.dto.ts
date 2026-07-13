import { z } from 'zod';

// ── Input DTOs ──────────────────────────────────────────────

export const RegisterUserSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  organizationId: z.string().uuid(),
});
export type RegisterUserDto = z.infer<typeof RegisterUserSchema>;

export const LoginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
  deviceName: z.string().max(200).optional(),
  deviceType: z.string().max(50).optional(),
  platform: z.string().max(100).optional(),
  browser: z.string().max(100).optional(),
});
export type LoginUserDto = z.infer<typeof LoginUserSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

export const RequestPasswordResetSchema = z.object({
  email: z.string().email(),
});
export type RequestPasswordResetDto = z.infer<typeof RequestPasswordResetSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;

export const RevokeSessionSchema = z.object({
  sessionId: z.string().uuid(),
});
export type RevokeSessionDto = z.infer<typeof RevokeSessionSchema>;

// ── Output DTOs ─────────────────────────────────────────────

export interface AuthResultDto {
  accessToken: string;
  user: UserProfileDto;
  session: SessionInfoDto;
}

export interface UserProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
}

export interface SessionInfoDto {
  id: string;
  createdAt: string;
  expiresAt: string;
  deviceName: string | null;
  ipAddress: string | null;
}

export interface RefreshResultDto {
  accessToken: string;
  session: SessionInfoDto;
}
