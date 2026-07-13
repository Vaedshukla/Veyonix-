import { PrismaClient, DeviceAssignment } from '@prisma/client';

export interface IDeviceAssignmentRepository {
  create(data: Omit<DeviceAssignment, 'id' | 'assignedAt' | 'removedAt'>): Promise<DeviceAssignment>;
}

export class PrismaDeviceAssignmentRepository implements IDeviceAssignmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Omit<DeviceAssignment, 'id' | 'assignedAt' | 'removedAt'>): Promise<DeviceAssignment> {
    return this.prisma.deviceAssignment.create({ data: data as any });
  }
}
