import { uuidv7 } from 'uuidv7';

export interface MembershipProps {
  id: string;
  userId: string;
  organizationId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class OrganizationMembershipEntity {
  private readonly props: MembershipProps;

  private constructor(props: MembershipProps) {
    this.props = { ...props };
  }

  static create(data: { userId: string; organizationId: string }): OrganizationMembershipEntity {
    return new OrganizationMembershipEntity({
      id: uuidv7(),
      userId: data.userId,
      organizationId: data.organizationId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: MembershipProps): OrganizationMembershipEntity {
    return new OrganizationMembershipEntity(props);
  }

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get organizationId(): string { return this.props.organizationId; }
  get isActive(): boolean { return this.props.isActive; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  toPlainObject(): MembershipProps {
    return { ...this.props };
  }
}
