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
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) return null;
    return this.mapToEntity(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) return null;
    return this.mapToEntity(user);
  }

  async update(
    id: string,
    user: Partial<Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<UserEntity> {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(user.email && { email: user.email.toLowerCase() }),
        ...(user.passwordHash && { passwordHash: user.passwordHash }),
        ...(user.role && { role: user.role as UserRole }),
        ...(user.organizationId && { organizationId: user.organizationId }),
        ...(user.isActive !== undefined && { isActive: user.isActive }),
        ...(user.isEmailVerified !== undefined && { isEmailVerified: user.isEmailVerified }),
      },
    });
    return this.mapToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async listByOrganization(orgId: string): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.mapToEntity(u));
  }

  private mapToEntity(user: any): UserEntity {
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      organizationId: user.organizationId,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
