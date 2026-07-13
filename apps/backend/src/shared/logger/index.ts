/**
 * Veyonix — Shared Logger Instances
 * 
 * Each logger is a child of the root Pino logger with a fixed
 * 'context' field so log streams can be filtered in Loki/Grafana.
 */
import pino from 'pino';
import { loggerConfig } from '@config/logger';

const rootLogger = pino(loggerConfig);

/** HTTP request lifecycle logger */
export const requestLogger = rootLogger.child({ context: 'http' });

/** Authentication events: logins, failures, token operations */
export const securityLogger = rootLogger.child({ context: 'security' });

/** Immutable audit trail for state-changing business actions */
export const auditLogger = rootLogger.child({ context: 'audit' });

/** Slow query detection, endpoint timing, performance alerts */
export const performanceLogger = rootLogger.child({ context: 'performance' });

/** BullMQ worker lifecycle: job start, success, failure, retry */
export const workerLogger = rootLogger.child({ context: 'worker' });

/** Desktop agent WebSocket connection, heartbeat, command events */
export const agentLogger = rootLogger.child({ context: 'agent' });

export { rootLogger as logger };
