import type { UserRole } from './enums';

export interface JwtPayload {
  sub: string;         // User ID (UUID v7)
  email: string;
  role: UserRole;
  orgId: string;       // Organization ID
  sessionId: string;   // Session ID for revocation
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface AgentJwtPayload {
  sub: string;         // Device ID
  orgId: string;
  fingerprint: string; // Device fingerprint
  type: 'agent';
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;   // Access token TTL in seconds
}

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId: string;
  sessionId: string;
}
