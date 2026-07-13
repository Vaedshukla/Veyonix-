import type { PrismaClient } from '@prisma/client';
import type { UsersRepository } from '../../domain/repositories/users.repository';
import type { UserEntity } from '../../../auth/domain/entities/User.entity';
import type { UserRole } from '@veyonix/shared-types';

export class PrismaUsersRepository implements UsersRepository {
  private readonly prisma: PrismaClient;

  constructor(dependencies: { prisma: PrismaClient }) {
    this.prisma = dependencies.prisma;
  }

  async findById(id: string): Promise<UserEntity | null> {
    throw new Error('Legacy method not implemented');
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    throw new Error('Legacy method not implemented');
  }

  async update(
    id: string,
    user: Partial<Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<UserEntity> {
    throw new Error('Legacy method not implemented');
  }

  async delete(id: string): Promise<void> {
    throw new Error('Legacy method not implemented');
  }

  async listByOrganization(orgId: string): Promise<UserEntity[]> {
    throw new Error('Legacy method not implemented');
  }

  private mapToEntity(user: any): UserEntity {
    throw new Error('Legacy method not implemented');
  }
}
