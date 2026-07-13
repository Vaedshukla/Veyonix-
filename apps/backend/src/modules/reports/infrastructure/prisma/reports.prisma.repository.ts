import type { PrismaClient } from '@prisma/client';
import type { ReportsRepository, ReportEntity } from '../../domain/repositories/reports.repository';

export class PrismaReportsRepository implements ReportsRepository {
  private readonly prisma: PrismaClient;

  constructor(dependencies: { prisma: PrismaClient }) {
    this.prisma = dependencies.prisma;
  }

  async create(report: {
    id: string;
    organizationId: string;
    name: string;
    type: string;
    parameters: any;
    status: string;
    generatedBy: string;
    scheduleCron?: string | null;
    expiresAt?: Date | null;
  }): Promise<ReportEntity> {
    const created = await this.prisma.report.create({
      data: {
        id: report.id,
        organizationId: report.organizationId,
        name: report.name,
        type: report.type,
        parameters: report.parameters,
        status: report.status,
        generatedBy: report.generatedBy,
        scheduleCron: report.scheduleCron ?? null,
        expiresAt: report.expiresAt ?? null,
      },
    });
    return this.mapToEntity(created);
  }

  async updateStatus(
    id: string,
    status: string,
    storagePath?: string | null,
    completedAt?: Date | null
  ): Promise<void> {
    await this.prisma.report.update({
      where: { id },
      data: {
        status,
        ...(storagePath !== undefined && { storagePath }),
        ...(completedAt !== undefined && { completedAt }),
      },
    });
  }

  async findById(id: string): Promise<ReportEntity | null> {
    const report = await this.prisma.report.findUnique({
      where: { id },
    });
    if (!report) return null;
    return this.mapToEntity(report);
  }

  async listByOrganization(orgId: string): Promise<ReportEntity[]> {
    const reports = await this.prisma.report.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
    return reports.map((r) => this.mapToEntity(r));
  }

  private mapToEntity(r: any): ReportEntity {
    return {
      id: r.id,
      organizationId: r.organizationId,
      name: r.name,
      type: r.type,
      parameters: r.parameters,
      status: r.status,
      storagePath: r.storagePath,
      generatedBy: r.generatedBy,
      scheduleCron: r.scheduleCron,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    };
  }
}
