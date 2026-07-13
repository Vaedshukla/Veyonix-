import type { IMembershipRepository } from '../../domain/repositories/IMembershipRepository';
import type { MembershipResultDto, ListMembersDto } from '../dtos/organization.dto';

export interface ListMembersDeps {
  membershipRepository: IMembershipRepository;
}

export class ListOrganizationMembersUseCase {
  constructor(private readonly deps: ListMembersDeps) {}

  async execute(dto: ListMembersDto): Promise<MembershipResultDto[]> {
    const memberships = await this.deps.membershipRepository.findByOrganization(
      dto.organizationId,
      { isActive: dto.isActive, limit: dto.limit, cursor: dto.cursor },
    );

    const results: MembershipResultDto[] = [];
    for (const m of memberships) {
      const roles = await this.deps.membershipRepository.getRoles(m.id);
      results.push({
        id: m.id,
        userId: m.userId,
        organizationId: m.organizationId,
        isActive: m.isActive,
        roles,
        createdAt: m.createdAt.toISOString(),
      });
    }
    return results;
  }
}
