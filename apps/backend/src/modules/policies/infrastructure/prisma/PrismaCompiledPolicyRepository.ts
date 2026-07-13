import { PrismaClient, CompiledPolicy } from '@prisma/client';

export class PrismaCompiledPolicyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Omit<CompiledPolicy, 'id' | 'compiledAt'>): Promise<CompiledPolicy> {
    return this.prisma.compiledPolicy.create({ data: data as any });
  }

  async findByDeviceId(deviceId: string): Promise<CompiledPolicy | null> {
    return this.prisma.compiledPolicy.findFirst({
      where: { deviceId },
      orderBy: { compiledAt: 'desc' },
    });
  }

  async delete(id: string): Promise<CompiledPolicy> {
    return this.prisma.compiledPolicy.delete({ where: { id } });
  }
}
