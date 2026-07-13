import { z } from 'zod';

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenCommand = z.infer<typeof refreshTokenSchema>;
