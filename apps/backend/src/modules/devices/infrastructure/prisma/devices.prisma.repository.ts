import type { PrismaClient } from '@prisma/client';
import type { DevicesRepository, DeviceEntity, DeviceCommandEntity } from '../../domain/repositories/devices.repository';
import type { DevicePlatform, DeviceStatus, CommandType, CommandStatus } from '@veyonix/shared-types';

export class PrismaDevicesRepository implements DevicesRepository {
  private readonly prisma: PrismaClient;

  constructor(dependencies: { prisma: PrismaClient }) {
    this.prisma = dependencies.prisma;
  }

  async findById(id: string): Promise<DeviceEntity | null> {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });
    if (!device) return null;
    return this.mapToEntity(device);
  }

  async findByMacAddress(macAddress: string): Promise<DeviceEntity | null> {
    const device = await this.prisma.device.findUnique({
      where: { macAddress },
    });
    if (!device) return null;
    return this.mapToEntity(device);
  }

  async create(device: {
    id: string;
    organizationId: string;
    macAddress: string;
    hostname: string;
    name: string;
    platform: DevicePlatform;
    status: DeviceStatus;
  }): Promise<DeviceEntity> {
    const created = await this.prisma.device.create({
      data: {
        id: device.id,
        organizationId: device.organizationId,
        macAddress: device.macAddress,
        hostname: device.hostname,
        name: device.name,
        platform: device.platform,
        status: device.status,
      },
    });
    return this.mapToEntity(created);
  }

  async update(
    id: string,
    device: Partial<Omit<DeviceEntity, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<DeviceEntity> {
    const updated = await this.prisma.device.update({
      where: { id },
      data: {
        ...(device.assignedUserId !== undefined && { assignedUserId: device.assignedUserId }),
        ...(device.managedById !== undefined && { managedById: device.managedById }),
        ...(device.macAddress && { macAddress: device.macAddress }),
        ...(device.hostname && { hostname: device.hostname }),
        ...(device.name && { name: device.name }),
        ...(device.platform && { platform: device.platform }),
        ...(device.osVersion !== undefined && { osVersion: device.osVersion }),
        ...(device.agentVersion !== undefined && { agentVersion: device.agentVersion }),
        ...(device.status && { status: device.status }),
        ...(device.isManaged !== undefined && { isManaged: device.isManaged }),
        ...(device.enrolledAt !== undefined && { enrolledAt: device.enrolledAt }),
        ...(device.lastSeenAt !== undefined && { lastSeenAt: device.lastSeenAt }),
      },
    });
    return this.mapToEntity(updated);
  }

  async listByOrganization(orgId: string): Promise<DeviceEntity[]> {
    const devices = await this.prisma.device.findMany({
      where: { organizationId: orgId },
      orderBy: { lastSeenAt: 'desc' },
    });
    return devices.map((d) => this.mapToEntity(d));
  }

  async saveHeartbeat(heartbeat: {
    id: string;
    deviceId: string;
    cpuPercent?: number;
    memoryMb?: number;
    diskFreeGb?: number;
    payload: any;
  }): Promise<void> {
    await this.prisma.deviceHeartbeat.create({
      data: {
        id: heartbeat.id,
        deviceId: heartbeat.deviceId,
        cpuPercent: heartbeat.cpuPercent ?? null,
        memoryMb: heartbeat.memoryMb ?? null,
        diskFreeGb: heartbeat.diskFreeGb ?? null,
        payload: heartbeat.payload,
      },
    });
  }

  async createCommand(command: {
    id: string;
    deviceId: string;
    issuedById: string;
    type: CommandType;
    payload?: any;
    expiresAt: Date;
  }): Promise<DeviceCommandEntity> {
    const created = await this.prisma.deviceCommand.create({
      data: {
        id: command.id,
        deviceId: command.deviceId,
        issuedById: command.issuedById,
        type: command.type,
        payload: command.payload ?? null,
        status: 'PENDING',
        expiresAt: command.expiresAt,
      },
    });
    return this.mapCommandToEntity(created);
  }

  async findCommandById(id: string): Promise<DeviceCommandEntity | null> {
    const cmd = await this.prisma.deviceCommand.findUnique({
      where: { id },
    });
    if (!cmd) return null;
    return this.mapCommandToEntity(cmd);
  }

  async listPendingCommands(deviceId: string): Promise<DeviceCommandEntity[]> {
    const cmds = await this.prisma.deviceCommand.findMany({
      where: {
        deviceId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      orderBy: { issuedAt: 'asc' },
    });
    return cmds.map((c) => this.mapCommandToEntity(c));
  }

  async updateCommandStatus(
    id: string,
    status: CommandStatus,
    sentAt?: Date,
    result?: { success: boolean; output?: any; errorCode?: string }
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.deviceCommand.update({
        where: { id },
        data: {
          status,
          ...(sentAt && { sentAt }),
        },
      });

      if (result) {
        await tx.deviceCommandResult.upsert({
          where: { commandId: id },
          update: {
            success: result.success,
            output: result.output ?? null,
            errorCode: result.errorCode ?? null,
          },
          create: {
            id: id, // uuidv7 fallback
            commandId: id,
            success: result.success,
            output: result.output ?? null,
            errorCode: result.errorCode ?? null,
          },
        });
      }
    });
  }

  async saveCertificate(cert: {
    id: string;
    deviceId: string;
    fingerprint: string;
    publicKey: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.deviceCertificate.create({
      data: {
        id: cert.id,
        deviceId: cert.deviceId,
        fingerprint: cert.fingerprint,
        publicKey: cert.publicKey,
        expiresAt: cert.expiresAt,
        isRevoked: false,
      },
    });
  }

  async findActiveCertificate(deviceId: string): Promise<{
    id: string;
    deviceId: string;
    publicKey: string;
    isRevoked: boolean;
    expiresAt: Date;
  } | null> {
    const cert = await this.prisma.deviceCertificate.findFirst({
      where: {
        deviceId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { issuedAt: 'desc' },
    });
    if (!cert) return null;
    return {
      id: cert.id,
      deviceId: cert.deviceId,
      publicKey: cert.publicKey,
      isRevoked: cert.isRevoked,
      expiresAt: cert.expiresAt,
    };
  }

  private mapToEntity(d: any): DeviceEntity {
    return {
      id: d.id,
      organizationId: d.organizationId,
      assignedUserId: d.assignedUserId,
      managedById: d.managedById,
      macAddress: d.macAddress,
      hostname: d.hostname,
      name: d.name,
      platform: d.platform,
      osVersion: d.osVersion,
      agentVersion: d.agentVersion,
      status: d.status,
      isManaged: d.isManaged,
      enrolledAt: d.enrolledAt,
      lastSeenAt: d.lastSeenAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  private mapCommandToEntity(c: any): DeviceCommandEntity {
    return {
      id: c.id,
      deviceId: c.deviceId,
      issuedById: c.issuedById,
      type: c.type,
      payload: c.payload,
      status: c.status,
      expiresAt: c.expiresAt,
      sentAt: c.sentAt,
      issuedAt: c.issuedAt,
    };
  }
}
