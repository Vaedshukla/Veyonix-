import type { AnalyticsRepository, WebsiteVisitEntity, ApplicationUsageEntity } from '../../domain/repositories/analytics.repository';
import type { PolicyAction } from '@veyonix/shared-types';

export class PrismaAnalyticsRepository implements AnalyticsRepository {
  private visits: WebsiteVisitEntity[] = [];
  private usages: ApplicationUsageEntity[] = [];

  constructor() {}

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
    const mapped = visits.map((v) => ({
      id: v.id,
      deviceId: v.deviceId,
      url: v.url,
      domain: v.domain,
      title: v.title ?? null,
      category: v.category ?? null,
      durationMs: v.durationMs ?? null,
      action: v.action,
      visitedAt: v.visitedAt,
    }));
    this.visits.push(...mapped);
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
    const mapped = usages.map((u) => ({
      id: u.id,
      deviceId: u.deviceId,
      appName: u.appName,
      bundleId: u.bundleId ?? null,
      durationMs: u.durationMs,
      startedAt: u.startedAt,
      endedAt: u.endedAt ?? null,
      isBlocked: u.isBlocked,
    }));
    this.usages.push(...mapped);
  }

  async listWebsiteVisits(deviceId: string, limit = 50): Promise<WebsiteVisitEntity[]> {
    return this.visits
      .filter((v) => v.deviceId === deviceId)
      .slice(-limit)
      .reverse();
  }

  async listApplicationUsages(deviceId: string, limit = 50): Promise<ApplicationUsageEntity[]> {
    return this.usages
      .filter((u) => u.deviceId === deviceId)
      .slice(-limit)
      .reverse();
  }
}
