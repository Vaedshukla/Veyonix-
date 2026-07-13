/**
 * Auth Domain — User Entity
 * Represents a system user within the auth domain context.
 * Phase 2: Full implementation
 */
export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  organizationId: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
