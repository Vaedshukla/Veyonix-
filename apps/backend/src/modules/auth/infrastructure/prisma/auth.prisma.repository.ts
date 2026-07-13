import type { PrismaClient } from '@prisma/client';
import type { AuthRepository, RefreshTokenEntity } from '../../domain/repositories/auth.repository';
import type { UserEntity } from '../../domain/entities/User.entity';
import type { UserRole } from '@veyonix/shared-types';

export class PrismaAuthRepository implements AuthRepository {
  private readonly prisma: PrismaClient;

  constructor(dependencies: { prisma: PrismaClient }) {
    this.prisma = dependencies.prisma;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) return null;
    return this.mapToEntity(user);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) return null;
    return this.mapToEntity(user);
  }

  async create(user: {
    id: string;
    email: string;
    passwordHash: string;
    role: string;
    organizationId: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    isEmailVerified: boolean;
  }): Promise<UserEntity> {
    const created = await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.email.toLowerCase(),
        passwordHash: user.passwordHash,
        role: user.role as UserRole,
        organizationId: user.organizationId,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
      },
    });
    return this.mapToEntity(created);
  }

  async saveRefreshToken(token: {
    id: string;
    userId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        tokenHash: token.tokenHash,
        familyId: token.familyId,
        expiresAt: token.expiresAt,
        userAgent: token.userAgent ?? null,
        ipAddress: token.ipAddress ?? null,
      },
    });
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenEntity | null> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!token) return null;
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      familyId: token.familyId,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      revokedAt: token.revokedAt,
      createdAt: token.createdAt,
    };
  }

  async markRefreshTokenUsed(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async revokeTokenFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId },
      data: { revokedAt: new Date() },
    });
  }

  async createSession(session: {
    id: string;
    userId: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<void> {
    await this.prisma.session.create({
      data: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
        userAgent: session.userAgent ?? null,
        ipAddress: session.ipAddress ?? null,
      },
    });
  }

  async findSession(sessionId: string): Promise<{ id: string; userId: string; revokedAt: Date | null; expiresAt: Date } | null> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) return null;
    return {
      id: session.id,
      userId: session.userId,
      revokedAt: session.revokedAt,
      expiresAt: session.expiresAt,
    };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
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
