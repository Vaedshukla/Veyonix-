import type { UserEntity } from '../entities/User.entity';

export interface RefreshTokenEntity {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface AuthRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  create(user: {
    id: string;
    email: string;
    passwordHash: string;
    role: string;
    organizationId: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    isEmailVerified: boolean;
  }): Promise<UserEntity>;
  
  // Refresh Token Management
  saveRefreshToken(token: {
    id: string;
    userId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<void>;
  
  findRefreshToken(tokenHash: string): Promise<RefreshTokenEntity | null>;
  markRefreshTokenUsed(id: string): Promise<void>;
  revokeTokenFamily(familyId: string): Promise<void>;
  
  // Session Management
  createSession(session: {
    id: string;
    userId: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<void>;
  
  findSession(sessionId: string): Promise<{ id: string; userId: string; revokedAt: Date | null; expiresAt: Date } | null>;
  revokeSession(sessionId: string): Promise<void>;
}
