import { uuidv7 } from 'uuidv7';

// Mirror the Prisma enum — no runtime dependency on @prisma/client
export type OrganizationType = 'SCHOOL_DISTRICT' | 'SCHOOL' | 'FAMILY' | 'ENTERPRISE';

export interface OrganizationProps {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  type: OrganizationType;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class OrganizationEntity {
  private readonly props: OrganizationProps;

  private constructor(props: OrganizationProps) {
    this.props = { ...props };
  }

  static create(data: {
    tenantId: string;
    name: string;
    slug: string;
    type: OrganizationType;
  }): OrganizationEntity {
    return new OrganizationEntity({
      id: uuidv7(),
      tenantId: data.tenantId,
      name: data.name,
      slug: data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      type: data.type,
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  }

  static reconstitute(props: OrganizationProps): OrganizationEntity {
    return new OrganizationEntity(props);
  }

  get id(): string { return this.props.id; }
  get tenantId(): string { return this.props.tenantId; }
  get name(): string { return this.props.name; }
  get slug(): string { return this.props.slug; }
  get type(): OrganizationType { return this.props.type; }
  get isActive(): boolean { return this.props.isActive; }
  get version(): number { return this.props.version; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get deletedAt(): Date | null { return this.props.deletedAt; }

  update(data: { name?: string; isActive?: boolean }): void {
    if (data.name !== undefined) this.props.name = data.name;
    if (data.isActive !== undefined) this.props.isActive = data.isActive;
    this.props.updatedAt = new Date();
    this.props.version += 1;
  }

  softDelete(): void {
    this.props.deletedAt = new Date();
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.props.version += 1;
  }

  toPlainObject(): OrganizationProps {
    return { ...this.props };
  }
}
