import { PrismaClient, EnrollmentToken } from '@prisma/client';

export interface IEnrollmentTokenRepository {
  findByTokenHash(hash: string): Promise<EnrollmentToken | null>;
  create(data: Omit<EnrollmentToken, 'id' | 'createdAt' | 'uses'>): Promise<EnrollmentToken>;
  update(id: string, data: Partial<EnrollmentToken>): Promise<EnrollmentToken>;
}

export class PrismaEnrollmentTokenRepository implements IEnrollmentTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByTokenHash(hash: string): Promise<EnrollmentToken | null> {
    return this.prisma.enrollmentToken.findUnique({ where: { tokenHash: hash } });
  }

  async create(data: Omit<EnrollmentToken, 'id' | 'createdAt' | 'uses'>): Promise<EnrollmentToken> {
    return this.prisma.enrollmentToken.create({ data: data as any });
  }

  async update(id: string, data: Partial<EnrollmentToken>): Promise<EnrollmentToken> {
    return this.prisma.enrollmentToken.update({ where: { id }, data });
  }
}
