export class OrganizationDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number = 400,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class OrganizationNotFoundError extends OrganizationDomainError {
  constructor(id?: string) {
    super(id ? `Organization '${id}' not found.` : 'Organization not found.', 'ORG_NOT_FOUND', 404);
  }
}

export class TenantNotFoundError extends OrganizationDomainError {
  constructor(id?: string) {
    super(id ? `Tenant '${id}' not found.` : 'Tenant not found.', 'TENANT_NOT_FOUND', 404);
  }
}

export class OrganizationSlugTakenError extends OrganizationDomainError {
  constructor(slug: string) {
    super(`The slug '${slug}' is already in use.`, 'ORG_SLUG_TAKEN', 409);
  }
}

export class MembershipAlreadyExistsError extends OrganizationDomainError {
  constructor() {
    super('User is already a member of this organization.', 'MEMBERSHIP_ALREADY_EXISTS', 409);
  }
}

export class MembershipNotFoundError extends OrganizationDomainError {
  constructor() {
    super('Membership not found.', 'MEMBERSHIP_NOT_FOUND', 404);
  }
}

export class RoleNotFoundError extends OrganizationDomainError {
  constructor(name?: string) {
    super(name ? `Role '${name}' not found.` : 'Role not found.', 'ROLE_NOT_FOUND', 404);
  }
}

export class InsufficientPermissionsError extends OrganizationDomainError {
  constructor() {
    super('You do not have permission to perform this action.', 'INSUFFICIENT_PERMISSIONS', 403);
  }
}

export class OrganizationInactiveError extends OrganizationDomainError {
  constructor() {
    super('This organization is inactive.', 'ORG_INACTIVE', 403);
  }
}
