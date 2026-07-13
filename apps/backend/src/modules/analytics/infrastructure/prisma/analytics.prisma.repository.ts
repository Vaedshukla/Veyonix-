import type { PrismaClient } from '@prisma/client';
import type { AnalyticsRepository, WebsiteVisitEntity, ApplicationUsageEntity } from '../../domain/repositories/analytics.repository';
import type { PolicyAction } from '@veyonix/shared-types';

export class PrismaAnalyticsRepository implements AnalyticsRepository {
  private readonly prisma: PrismaClient;

  constructor(dependencies: { prisma: PrismaClient }) {
    this.prisma = dependencies.prisma;
  }

  async saveWebsiteVisits(visits: Array<{
    id: string;
    deviceId: string;
    url: string;
    domain: string;
    title?: string;
    category?: string;
    durationMs?: number;
    action: PolicyAction;
    visitedAt: Date;
  }>): Promise<void> {
    await this.prisma.websiteVisit.createMany({
      data: visits.map((v) => ({
        id: v.id,
        deviceId: v.deviceId,
        url: v.url,
        domain: v.domain,
        title: v.title ?? null,
        category: v.category ?? null,
        durationMs: v.durationMs ?? null,
        action: v.action,
        visitedAt: v.visitedAt,
      })),
    });
  }

  async saveApplicationUsage(usages: Array<{
    id: string;
    deviceId: string;
    appName: string;
    bundleId?: string;
    durationMs: number;
    startedAt: Date;
    endedAt?: Date;
    isBlocked: boolean;
  }>): Promise<void> {
    await this.prisma.applicationUsage.createMany({
      data: usages.map((u) => ({
        id: u.id,
        deviceId: u.deviceId,
        appName: u.appName,
        bundleId: u.bundleId ?? null,
        durationMs: u.durationMs,
        startedAt: u.startedAt,
        endedAt: u.endedAt ?? null,
        isBlocked: u.isBlocked,
      })),
    });
  }

  async listWebsiteVisits(deviceId: string, limit = 50): Promise<WebsiteVisitEntity[]> {
    const visits = await this.prisma.websiteVisit.findMany({
      where: { deviceId },
      orderBy: { visitedAt: 'desc' },
      take: limit,
    });
    return visits.map((v) => ({
      id: v.id,
      deviceId: v.deviceId,
      url: v.url,
      domain: v.domain,
      title: v.title,
      category: v.category,
      durationMs: v.durationMs,
      action: v.action as PolicyAction,
      visitedAt: v.visitedAt,
    }));
  }

  async listApplicationUsages(deviceId: string, limit = 50): Promise<ApplicationUsageEntity[]> {
    const usages = await this.prisma.applicationUsage.findMany({
      where: { deviceId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
    return usages.map((u) => ({
      id: u.id,
      deviceId: u.deviceId,
      appName: u.appName,
      bundleId: u.bundleId,
      durationMs: u.durationMs,
      startedAt: u.startedAt,
      endedAt: u.endedAt,
      isBlocked: u.isBlocked,
    }));
  }
}
