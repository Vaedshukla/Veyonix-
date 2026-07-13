import type { IdentityAuditAction, AuditSource, AuditSeverity } from '@prisma/client';

export interface AuditLogEntry {
  action: IdentityAuditAction;
  actorId?: string | null;
  targetId?: string | null;
  organizationId?: string | null;
  source?: AuditSource;
  severity?: AuditSeverity;
  correlationId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
}

export interface IAuditLogger {
  log(entry: AuditLogEntry): Promise<void>;
}
