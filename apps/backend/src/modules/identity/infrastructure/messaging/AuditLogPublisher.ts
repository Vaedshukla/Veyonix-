import type { PrismaClient } from '@prisma/client';
import type { IAuditLogger, AuditLogEntry } from '../../domain/services/IAuditLogger';

/**
 * Persists audit log entries directly to the database.
 *
 * In a high-throughput environment, this would be replaced by a BullMQ queue
 * publisher that writes asynchronously to avoid blocking the request lifecycle.
 * For Phase 2, synchronous writes are acceptable.
 */
export class PrismaAuditLogPublisher implements IAuditLogger {
  constructor(private readonly prisma: PrismaClient) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: entry.action,
        source: entry.source ?? 'SYSTEM',
        severity: entry.severity ?? 'INFO',
        organizationId: entry.organizationId ?? null,
        actorId: entry.actorId ?? null,
        targetId: entry.targetId ?? null,
        correlationId: entry.correlationId ?? null,
        requestId: entry.requestId ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        details: entry.details ? (entry.details as object) : undefined,
      },
    });
  }
}
