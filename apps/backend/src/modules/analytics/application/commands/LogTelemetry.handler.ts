import { generateId } from '@shared/utils/id';
import { DomainEventType, publishEvent } from '@shared/events/event-bus';
import type { AnalyticsRepository } from '../../domain/repositories/analytics.repository';
import type { LogTelemetryCommand } from './LogTelemetry.command';

export class LogTelemetryHandler {
  private readonly analyticsRepository: AnalyticsRepository;

  constructor(dependencies: {
    analyticsRepository: AnalyticsRepository;
  }) {
    this.analyticsRepository = dependencies.analyticsRepository;
  }

  async handle(deviceId: string, organizationId: string, command: LogTelemetryCommand): Promise<void> {
    // 1. Process Website Visits
    if (command.visits.length > 0) {
      const visitsToSave = command.visits.map((v) => ({
        id: generateId(),
        deviceId,
        url: v.url,
        domain: v.domain,
        title: v.title,
        category: v.category,
        durationMs: v.durationMs,
        action: v.action,
        visitedAt: v.visitedAt,
      }));

      await this.analyticsRepository.saveWebsiteVisits(visitsToSave);

      // Emit block alerts for blocked sites
      for (const visit of visitsToSave) {
        if (visit.action === 'BLOCK') {
          await publishEvent(DomainEventType.ALERT_GENERATED, {
            aggregateId: visit.id,
            organizationId,
            payload: {
              type: 'BLOCKED_CONTENT',
              severity: 'MEDIUM',
              message: `Blocked website visit attempt: ${visit.domain}`,
              deviceId,
            },
          });
        }
      }
    }

    // 2. Process App Usages
    if (command.appUsages.length > 0) {
      const usagesToSave = command.appUsages.map((u) => ({
        id: generateId(),
        deviceId,
        appName: u.appName,
        bundleId: u.bundleId,
        durationMs: u.durationMs,
        startedAt: u.startedAt,
        endedAt: u.endedAt,
        isBlocked: u.isBlocked,
      }));

      await this.analyticsRepository.saveApplicationUsage(usagesToSave);

      // Emit block alerts for blocked apps
      for (const usage of usagesToSave) {
        if (usage.isBlocked) {
          await publishEvent(DomainEventType.ALERT_GENERATED, {
            aggregateId: usage.id,
            organizationId,
            payload: {
              type: 'SUSPICIOUS_APP',
              severity: 'HIGH',
              message: `Blocked application launch attempt: ${usage.appName}`,
              deviceId,
            },
          });
        }
      }
    }
  }
}
