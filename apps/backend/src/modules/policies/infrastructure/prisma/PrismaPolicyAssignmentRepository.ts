import { PrismaClient, PolicyAssignment } from '@prisma/client';

export class PrismaPolicyAssignmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Omit<PolicyAssignment, 'id' | 'createdAt'>): Promise<PolicyAssignment> {
    return this.prisma.policyAssignment.create({ data });
  }

  async findByPolicyId(policyId: string): Promise<PolicyAssignment[]> {
    return this.prisma.policyAssignment.findMany({ where: { policyId } });
  }

  async findByTarget(targetType: 'DEVICE' | 'USER' | 'GROUP' | 'ORGANIZATION', targetId: string): Promise<PolicyAssignment[]> {
    return this.prisma.policyAssignment.findMany({ where: { targetType, targetId } });
  }

  async delete(id: string): Promise<PolicyAssignment> {
    return this.prisma.policyAssignment.delete({ where: { id } });
  }
}
