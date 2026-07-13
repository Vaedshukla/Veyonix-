import type { UserEntity } from '../../../auth/domain/entities/User.entity';

export interface UsersRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  update(
    id: string,
    user: Partial<Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<UserEntity>;
  delete(id: string): Promise<void>;
  listByOrganization(orgId: string): Promise<UserEntity[]>;
}
