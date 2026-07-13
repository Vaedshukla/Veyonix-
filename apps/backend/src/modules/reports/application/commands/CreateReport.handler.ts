import { generateId } from '@shared/utils/id';
import { dispatchReport } from '@/queues';
import type { ReportsRepository, ReportEntity } from '../../domain/repositories/reports.repository';
import type { CreateReportCommand } from './CreateReport.command';

export class CreateReportHandler {
  private readonly reportsRepository: ReportsRepository;

  constructor(dependencies: {
    reportsRepository: ReportsRepository;
  }) {
    this.reportsRepository = dependencies.reportsRepository;
  }

  async handle(command: CreateReportCommand, organizationId: string, userId: string): Promise<ReportEntity> {
    const reportId = generateId();

    // 1. Create DB entry in pending state
    const report = await this.reportsRepository.create({
      id: reportId,
      organizationId,
      name: command.name,
      type: command.type,
      parameters: command.parameters ?? {},
      status: 'pending',
      generatedBy: userId,
      scheduleCron: command.scheduleCron ?? null,
    });

    // 2. Dispatch to background worker
    await dispatchReport({
      reportId: report.id,
      organizationId,
      type: report.type,
      parameters: report.parameters,
      requestedBy: userId,
    });

    return report;
  }
}
