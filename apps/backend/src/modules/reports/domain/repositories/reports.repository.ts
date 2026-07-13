export interface ReportEntity {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  parameters: any;
  status: string;
  storagePath: string | null;
  generatedBy: string;
  scheduleCron: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface ReportsRepository {
  create(report: {
    id: string;
    organizationId: string;
    name: string;
    type: string;
    parameters: any;
    status: string;
    generatedBy: string;
    scheduleCron?: string | null;
    expiresAt?: Date | null;
  }): Promise<ReportEntity>;

  updateStatus(
    id: string,
    status: string,
    storagePath?: string | null,
    completedAt?: Date | null
  ): Promise<void>;

  findById(id: string): Promise<ReportEntity | null>;
  listByOrganization(orgId: string): Promise<ReportEntity[]>;
}
