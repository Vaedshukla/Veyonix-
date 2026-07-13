import { PrismaClient, Policy } from '@prisma/client';

export class PrismaPolicyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Omit<Policy, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Policy> {
    return this.prisma.policy.create({ data });
  }

  async findById(id: string): Promise<Policy | null> {
    return this.prisma.policy.findUnique({ where: { id } });
  }

  async findByOrganizationId(organizationId: string): Promise<Policy[]> {
    return this.prisma.policy.findMany({ where: { organizationId, deletedAt: null } });
  }

  async update(id: string, data: Partial<Policy>): Promise<Policy> {
    return this.prisma.policy.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Policy> {
    return this.prisma.policy.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
