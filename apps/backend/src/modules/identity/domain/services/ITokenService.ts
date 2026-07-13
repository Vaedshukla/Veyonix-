export interface AccessTokenPayload {
  sub: string;       // userId
  sessionId: string;
  email: string;
  role: string;      // primary role name for fast checks
  orgId: string;
  iat?: number;
  exp?: number;
}

export interface ITokenService {
  generateAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): string;
  /** Returns a random opaque string (not a JWT) suitable for use as a refresh token. */
  generateRefreshToken(): string;
  verifyAccessToken(token: string): AccessTokenPayload;
  /** Returns the SHA-256 hex digest of the given token string. */
  hashToken(token: string): string;
}
