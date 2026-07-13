import type { PrismaClient } from '@prisma/client';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import { RefreshTokenEntity } from '../../domain/entities/RefreshToken.entity';

type PrismaRefreshToken = {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  rotatedFromTokenId: string | null;
  rotationCounter: number;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
};

export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(record: PrismaRefreshToken): RefreshTokenEntity {
    return RefreshTokenEntity.reconstitute({
      id: record.id,
      userId: record.userId,
      tokenHash: record.tokenHash,
      familyId: record.familyId,
      rotatedFromTokenId: record.rotatedFromTokenId,
      rotationCounter: record.rotationCounter,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
      revokedAt: record.revokedAt,
      userAgent: record.userAgent,
      ipAddress: record.ipAddress,
      createdAt: record.createdAt,
    });
  }

  async create(token: RefreshTokenEntity): Promise<RefreshTokenEntity> {
    const props = token.toPlainObject();
    const record = await this.prisma.refreshToken.create({
      data: {
        id: props.id,
        userId: props.userId,
        tokenHash: props.tokenHash,
        familyId: props.familyId,
        rotatedFromTokenId: props.rotatedFromTokenId,
        rotationCounter: props.rotationCounter,
        expiresAt: props.expiresAt,
        userAgent: props.userAgent,
        ipAddress: props.ipAddress,
      },
    });
    return this.toDomain(record);
  }

  async findByTokenHash(hash: string): Promise<RefreshTokenEntity | null> {
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    return record ? this.toDomain(record) : null;
  }

  async findByFamilyId(familyId: string): Promise<RefreshTokenEntity[]> {
    const records = await this.prisma.refreshToken.findMany({ where: { familyId } });
    return records.map((r) => this.toDomain(r));
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.refreshToken.update({ where: { id }, data: { usedAt: new Date() } });
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
