import { uuidv7 } from 'uuidv7';

export interface TenantProps {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class TenantEntity {
  private readonly props: TenantProps;

  private constructor(props: TenantProps) {
    this.props = { ...props };
  }

  static create(data: { name: string; slug: string }): TenantEntity {
    const slug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return new TenantEntity({
      id: uuidv7(),
      name: data.name,
      slug,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  }

  static reconstitute(props: TenantProps): TenantEntity {
    return new TenantEntity(props);
  }

  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get slug(): string { return this.props.slug; }
  get isActive(): boolean { return this.props.isActive; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get deletedAt(): Date | null { return this.props.deletedAt; }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  toPlainObject(): TenantProps {
    return { ...this.props };
  }
}
