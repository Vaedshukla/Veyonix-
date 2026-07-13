/**
 * Veyonix WebSocket Gateway
 *
 * Handles persistent WebSocket connections from:
 * 1. Desktop Agents (primary protocol for real-time command delivery)
 * 2. Dashboard clients (real-time alert/device status streaming)
 *
 * Architecture:
 * - Agents authenticate with a short-lived agent JWT on connect
 * - Rooms: org:{orgId}, device:{deviceId}
 * - Messages are typed via WsMessageType enum
 */
import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';

export enum WsMessageType {
  // Agent → Server
  HEARTBEAT = 'heartbeat',
  TELEMETRY = 'telemetry',
  COMMAND_ACK = 'command_ack',
  POLICY_ACK = 'policy_ack',
  WEBSITE_VISIT = 'website_visit',
  APP_USAGE = 'app_usage',
  BLOCKED_REQUEST = 'blocked_request',
  ALERT = 'alert',

  // Server → Agent
  COMMAND = 'command',
  POLICY_SYNC = 'policy_sync',
  CONFIG_UPDATE = 'config_update',
  PING = 'ping',

  // Server → Dashboard
  DEVICE_STATUS = 'device_status',
  REAL_TIME_ALERT = 'real_time_alert',
  ACTIVITY_UPDATE = 'activity_update',

  // Both directions
  ERROR = 'error',
  PONG = 'pong',
}

export interface WsMessage<T = unknown> {
  type: WsMessageType;
  payload: T;
  requestId?: string; // For request/response correlation
  timestamp: string;
}

export interface ConnectedAgent {
  socket: WebSocket;
  deviceId: string;
  organizationId: string;
  agentVersion: string;
  connectedAt: Date;
  lastHeartbeatAt: Date;
}

export interface ConnectedDashboard {
  socket: WebSocket;
  userId: string;
  organizationId: string;
  connectedAt: Date;
}

/**
 * In-memory connection registry.
 * In production with multiple instances, this would use Redis Pub/Sub.
 */
class ConnectionRegistry {
  private agents = new Map<string, ConnectedAgent>(); // deviceId → agent
  private dashboards = new Map<string, ConnectedDashboard>(); // userId → dashboard

  registerAgent(deviceId: string, agent: ConnectedAgent): void {
    this.agents.set(deviceId, agent);
  }

  unregisterAgent(deviceId: string): void {
    this.agents.delete(deviceId);
  }

  getAgent(deviceId: string): ConnectedAgent | undefined {
    return this.agents.get(deviceId);
  }

  getAgentsByOrg(organizationId: string): ConnectedAgent[] {
    return Array.from(this.agents.values()).filter(
      (a) => a.organizationId === organizationId,
    );
  }

  registerDashboard(userId: string, dashboard: ConnectedDashboard): void {
    this.dashboards.set(userId, dashboard);
  }

  unregisterDashboard(userId: string): void {
    this.dashboards.delete(userId);
  }

  getDashboardsByOrg(organizationId: string): ConnectedDashboard[] {
    return Array.from(this.dashboards.values()).filter(
      (d) => d.organizationId === organizationId,
    );
  }

  getStats() {
    return {
      connectedAgents: this.agents.size,
      connectedDashboards: this.dashboards.size,
    };
  }
}

export const registry = new ConnectionRegistry();

/**
 * Send a typed message to a WebSocket connection.
 * Handles serialization and error catching.
 */
export function sendWsMessage<T>(
  socket: WebSocket,
  type: WsMessageType,
  payload: T,
  requestId?: string,
): void {
  if (socket.readyState !== socket.OPEN) return;

  const message: WsMessage<T> = {
    type,
    payload,
    requestId,
    timestamp: new Date().toISOString(),
  };

  try {
    socket.send(JSON.stringify(message));
  } catch {
    // Socket closed mid-send
  }
}

/**
 * Parse an incoming WebSocket message safely.
 */
export function parseWsMessage(raw: unknown): WsMessage | null {
  try {
    const data = typeof raw === 'string' ? raw : raw?.toString();
    if (!data) return null;
    const parsed = JSON.parse(data) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('type' in parsed) ||
      !('payload' in parsed)
    ) {
      return null;
    }
    return parsed as WsMessage;
  } catch {
    return null;
  }
}

/**
 * Register the WebSocket gateway with Fastify.
 * Called from bootstrap/plugins.ts after WebSocket plugin is registered.
 */
export async function registerWebSocketGateway(
  app: FastifyInstance,
): Promise<void> {
  app.log.info('🔌 WebSocket gateway registered');

  // Expose registry stats via health endpoint
  app.decorate('wsRegistry', registry);
}

declare module 'fastify' {
  interface FastifyInstance {
    wsRegistry: ConnectionRegistry;
  }
}
