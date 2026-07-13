import type { PolicyAction } from '@veyonix/shared-types';

export interface WebsiteVisitEntity {
  id: string;
  deviceId: string;
  url: string;
  domain: string;
  title: string | null;
  category: string | null;
  durationMs: number | null;
  action: PolicyAction;
  visitedAt: Date;
}

export interface ApplicationUsageEntity {
  id: string;
  deviceId: string;
  appName: string;
  bundleId: string | null;
  durationMs: number;
  startedAt: Date;
  endedAt: Date | null;
  isBlocked: boolean;
}

export interface AnalyticsRepository {
  saveWebsiteVisits(visits: Array<{
    id: string;
    deviceId: string;
    url: string;
    domain: string;
    title?: string;
    category?: string;
    durationMs?: number;
    action: PolicyAction;
    visitedAt: Date;
  }>): Promise<void>;

  saveApplicationUsage(usages: Array<{
    id: string;
    deviceId: string;
    appName: string;
    bundleId?: string;
    durationMs: number;
    startedAt: Date;
    endedAt?: Date;
    isBlocked: boolean;
  }>): Promise<void>;

  listWebsiteVisits(deviceId: string, limit?: number): Promise<WebsiteVisitEntity[]>;
  listApplicationUsages(deviceId: string, limit?: number): Promise<ApplicationUsageEntity[]>;
}
