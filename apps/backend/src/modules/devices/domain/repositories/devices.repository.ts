import type { DevicePlatform, DeviceStatus, CommandType, CommandStatus } from '@veyonix/shared-types';

export interface DeviceEntity {
  id: string;
  organizationId: string;
  assignedUserId: string | null;
  managedById: string | null;
  macAddress: string;
  hostname: string;
  name: string;
  platform: DevicePlatform;
  osVersion: string | null;
  agentVersion: string | null;
  status: DeviceStatus;
  isManaged: boolean;
  enrolledAt: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceCommandEntity {
  id: string;
  deviceId: string;
  issuedById: string;
  type: CommandType;
  payload: any | null;
  status: CommandStatus;
  expiresAt: Date;
  sentAt: Date | null;
  issuedAt: Date;
}

export interface DevicesRepository {
  findById(id: string): Promise<DeviceEntity | null>;
  findByMacAddress(macAddress: string): Promise<DeviceEntity | null>;
  create(device: {
    id: string;
    organizationId: string;
    macAddress: string;
    hostname: string;
    name: string;
    platform: DevicePlatform;
    status: DeviceStatus;
  }): Promise<DeviceEntity>;
  update(
    id: string,
    device: Partial<Omit<DeviceEntity, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<DeviceEntity>;
  listByOrganization(orgId: string): Promise<DeviceEntity[]>;
  
  // Telemetry & Heartbeat
  saveHeartbeat(heartbeat: {
    id: string;
    deviceId: string;
    cpuPercent?: number;
    memoryMb?: number;
    diskFreeGb?: number;
    payload: any;
  }): Promise<void>;

  // Commands
  createCommand(command: {
    id: string;
    deviceId: string;
    issuedById: string;
    type: CommandType;
    payload?: any;
    expiresAt: Date;
  }): Promise<DeviceCommandEntity>;
  findCommandById(id: string): Promise<DeviceCommandEntity | null>;
  listPendingCommands(deviceId: string): Promise<DeviceCommandEntity[]>;
  updateCommandStatus(
    id: string,
    status: CommandStatus,
    sentAt?: Date,
    result?: { success: boolean; output?: any; errorCode?: string }
  ): Promise<void>;

  // Certificates
  saveCertificate(cert: {
    id: string;
    deviceId: string;
    fingerprint: string;
    publicKey: string;
    expiresAt: Date;
  }): Promise<void>;
  
  findActiveCertificate(deviceId: string): Promise<{
    id: string;
    deviceId: string;
    publicKey: string;
    isRevoked: boolean;
    expiresAt: Date;
  } | null>;
}
