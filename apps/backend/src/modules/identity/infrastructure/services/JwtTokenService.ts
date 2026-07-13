import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import type { ITokenService, AccessTokenPayload } from '../../domain/services/ITokenService';

export interface JwtTokenServiceConfig {
  accessSecret: string;
  accessTtlSeconds: number;
  refreshSecret: string;
}

/**
 * JWT-based token service.
 *
 * Access tokens: Short-lived signed JWTs (15 minutes).
 * Refresh tokens: Long-lived cryptographically random opaque strings (NOT JWTs).
 *   We hash them before storage using SHA-256.
 */
export class JwtTokenService implements ITokenService {
  constructor(private readonly config: JwtTokenServiceConfig) {}

  generateAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.config.accessSecret, {
      expiresIn: this.config.accessTtlSeconds,
      algorithm: 'HS256',
    });
  }

  generateRefreshToken(): string {
    // A cryptographically random 64-byte opaque token (128-char hex string)
    return crypto.randomBytes(64).toString('hex');
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const payload = jwt.verify(token, this.config.accessSecret, {
      algorithms: ['HS256'],
    }) as AccessTokenPayload;
    return payload;
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
