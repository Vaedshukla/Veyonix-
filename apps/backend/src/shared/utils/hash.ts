import crypto from 'node:crypto';

/**
 * Hash a sensitive token (e.g., API key, refresh token) using SHA-256.
 * Used for storing tokens in the database without exposing the raw value.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a cryptographically random token of the specified byte length.
 * Returns the token as a hex string.
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
