import type { PrismaClient } from '@prisma/client';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserEntity, type UserProps } from '../../domain/entities/User.entity';

type PrismaUser = {
  id: string;
  email: string;
  normalizedEmail: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(record: PrismaUser): UserEntity {
    return UserEntity.reconstitute({
      id: record.id,
      email: record.email,
      normalizedEmail: record.normalizedEmail,
      passwordHash: record.passwordHash,
      firstName: record.firstName,
      lastName: record.lastName,
      isActive: record.isActive,
      isEmailVerified: record.isEmailVerified,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: record.lastLoginAt,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }

  async findById(id: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByNormalizedEmail(normalizedEmail: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findFirst({
      where: { normalizedEmail, deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByOrganization(options: {
    organizationId?: string;
    isActive?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<UserEntity[]> {
    const records = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(options.isActive !== undefined ? { isActive: options.isActive } : {}),
        ...(options.organizationId
          ? {
              memberships: {
                some: { organizationId: options.organizationId, isActive: true },
              },
            }
          : {}),
      },
      take: options.limit ?? 20,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async create(user: UserEntity): Promise<UserEntity> {
    const props = user.toPlainObject();
    const record = await this.prisma.user.create({
      data: {
        id: props.id,
        email: props.email,
        normalizedEmail: props.normalizedEmail,
        passwordHash: props.passwordHash,
        firstName: props.firstName,
        lastName: props.lastName,
        isActive: props.isActive,
        isEmailVerified: props.isEmailVerified,
        version: props.version,
      },
    });
    return this.toDomain(record);
  }

  async update(user: UserEntity): Promise<UserEntity> {
    const props = user.toPlainObject();
    const record = await this.prisma.user.update({
      where: { id: props.id },
      data: {
        email: props.email,
        normalizedEmail: props.normalizedEmail,
        passwordHash: props.passwordHash,
        firstName: props.firstName,
        lastName: props.lastName,
        isActive: props.isActive,
        isEmailVerified: props.isEmailVerified,
        lastLoginAt: props.lastLoginAt,
        version: props.version,
        updatedAt: new Date(),
        deletedAt: props.deletedAt,
      },
    });
    return this.toDomain(record);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedAt: new Date() },
    });
  }

  async incrementFailedLoginAttempts(
    id: string,
  ): Promise<{ failedAttempts: number; lockedUntil: Date | null }> {
    // Note: failedLoginAttempts and lockedUntil are tracked in Redis for performance.
    // This is a DB fallback. In the real system these fields would be on the user table.
    // For now, we increment a Redis counter (handled by the use case via Redis directly).
    // Return safe defaults since the schema doesn't yet have these columns.
    return { failedAttempts: 1, lockedUntil: null };
  }

  async resetFailedLoginAttempts(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date(), updatedAt: new Date() },
    });
  }
}
