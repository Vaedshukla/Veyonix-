import type { PrismaClient } from '@prisma/client';
import type { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import { SessionEntity, type SessionProps } from '../../domain/entities/Session.entity';

type PrismaSession = {
  id: string;
  userId: string;
  deviceName: string | null;
  deviceType: string | null;
  platform: string | null;
  browser: string | null;
  location: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  createdAt: Date;
  lastActiveAt: Date;
};

export class PrismaSessionRepository implements ISessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(record: PrismaSession): SessionEntity {
    return SessionEntity.reconstitute({
      id: record.id,
      userId: record.userId,
      deviceName: record.deviceName,
      deviceType: record.deviceType,
      platform: record.platform,
      browser: record.browser,
      location: record.location,
      ipAddress: record.ipAddress,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      revokedReason: record.revokedReason,
      createdAt: record.createdAt,
      lastActiveAt: record.lastActiveAt,
    });
  }

  async create(session: SessionEntity): Promise<SessionEntity> {
    const props = session.toPlainObject();
    const record = await this.prisma.session.create({
      data: {
        id: props.id,
        userId: props.userId,
        deviceName: props.deviceName,
        deviceType: props.deviceType,
        platform: props.platform,
        browser: props.browser,
        location: props.location,
        ipAddress: props.ipAddress,
        expiresAt: props.expiresAt,
      },
    });
    return this.toDomain(record);
  }

  async findById(id: string): Promise<SessionEntity | null> {
    const record = await this.prisma.session.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findActiveByUserId(userId: string): Promise<SessionEntity[]> {
    const records = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async revoke(id: string, reason: string): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  async revokeAllForUser(userId: string, reason: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  async updateLastActive(id: string): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    });
  }
}
