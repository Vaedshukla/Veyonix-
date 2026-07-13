import { PrismaClient, Device } from '@prisma/client';

export interface IDeviceRepository {
  findById(id: string): Promise<Device | null>;
  findByOrganizationId(organizationId: string): Promise<Device[]>;
  create(data: Omit<Device, 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Device>;
  update(id: string, data: Partial<Device>): Promise<Device>;
}

export class PrismaDeviceRepository implements IDeviceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Device | null> {
    return this.prisma.device.findUnique({ where: { id } });
  }

  async findByOrganizationId(organizationId: string): Promise<Device[]> {
    return this.prisma.device.findMany({ where: { organizationId } });
  }

  async create(data: Omit<Device, 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Device> {
    return this.prisma.device.create({ data: data as any });
  }

  async update(id: string, data: Partial<Device>): Promise<Device> {
    return this.prisma.device.update({ where: { id }, data });
  }
}
