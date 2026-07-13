import { generateId } from '@shared/utils/id';
import { NotFoundError } from '@shared/errors/DomainError';
import type { OrganizationsRepository, SchoolEntity } from '../../domain/repositories/organizations.repository';
import type { CreateSchoolCommand } from './CreateSchool.command';

export class CreateSchoolHandler {
  private readonly organizationsRepository: OrganizationsRepository;

  constructor(dependencies: {
    organizationsRepository: OrganizationsRepository;
  }) {
    this.organizationsRepository = dependencies.organizationsRepository;
  }

  async handle(command: CreateSchoolCommand): Promise<SchoolEntity> {
    const org = await this.organizationsRepository.findOrganizationById(command.organizationId);
    if (!org) {
      throw new NotFoundError(`Organization '${command.organizationId}' was not found.`);
    }

    const schoolId = generateId();

    return this.organizationsRepository.createSchool({
      id: schoolId,
      organizationId: command.organizationId,
      name: command.name,
      address: command.address,
      phone: command.phone,
      principalName: command.principalName,
    });
  }
}
