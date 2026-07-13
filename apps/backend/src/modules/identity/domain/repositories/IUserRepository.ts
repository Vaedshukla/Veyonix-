import type { UserEntity } from '../entities/User.entity';

export interface FindUsersOptions {
  tenantId?: string;
  organizationId?: string;
  isActive?: boolean;
  limit?: number;
  cursor?: string;
}

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByNormalizedEmail(normalizedEmail: string): Promise<UserEntity | null>;
  findByOrganization(options: FindUsersOptions): Promise<UserEntity[]>;
  create(user: UserEntity): Promise<UserEntity>;
  update(user: UserEntity): Promise<UserEntity>;
  softDelete(id: string): Promise<void>;
  incrementFailedLoginAttempts(
    id: string,
  ): Promise<{ failedAttempts: number; lockedUntil: Date | null }>;
  resetFailedLoginAttempts(id: string): Promise<void>;
}
