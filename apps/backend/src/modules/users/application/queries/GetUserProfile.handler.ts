import { UserNotFoundError } from '../../domain/errors/UserErrors';
import type { UsersRepository } from '../../domain/repositories/users.repository';
import type { OrganizationsRepository } from '../../../organizations/domain/repositories/organizations.repository';
import type { CurrentUser } from '@veyonix/shared-types';

export class GetUserProfileHandler {
  private readonly usersRepository: UsersRepository;
  private readonly organizationsRepository: OrganizationsRepository;

  constructor(dependencies: {
    usersRepository: UsersRepository;
    organizationsRepository: OrganizationsRepository;
  }) {
    this.usersRepository = dependencies.usersRepository;
    this.organizationsRepository = dependencies.organizationsRepository;
  }

  async handle(userId: string): Promise<CurrentUser & { organizationName: string }> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const org = await this.organizationsRepository.findOrganizationById(user.organizationId);
    const orgName = org ? org.name : 'Unknown Organization';

    return {
      id: user.id,
      email: user.email,
      fullName: `${user.id}`, // Detail resolution
      role: user.role as any,
      organizationId: user.organizationId,
      organizationName: orgName,
      sessionId: '', // Handled at controller request context level if needed
    };
  }
}
