import { PermissionEntity } from './Permission.entity';

export interface RoleProps {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  isSystem: boolean;
  isDefault: boolean;
  priority: number;
  version: number;
  permissions: PermissionEntity[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class RoleEntity {
  private readonly props: RoleProps;

  private constructor(props: RoleProps) {
    this.props = { ...props };
  }

  static reconstitute(props: RoleProps): RoleEntity {
    return new RoleEntity(props);
  }

  get id(): string { return this.props.id; }
  get organizationId(): string | null { return this.props.organizationId; }
  get name(): string { return this.props.name; }
  get description(): string | null { return this.props.description; }
  get isSystem(): boolean { return this.props.isSystem; }
  get isDefault(): boolean { return this.props.isDefault; }
  get priority(): number { return this.props.priority; }
  get version(): number { return this.props.version; }
  get permissions(): PermissionEntity[] { return [...this.props.permissions]; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get deletedAt(): Date | null { return this.props.deletedAt; }

  hasPermission(key: string): boolean {
    return this.props.permissions.some((p) => p.matches(key));
  }

  getPermissionKeys(): string[] {
    return this.props.permissions.map((p) => p.key);
  }

  toPlainObject(): Omit<RoleProps, 'permissions'> & { permissionKeys: string[] } {
    const { permissions, ...rest } = this.props;
    return {
      ...rest,
      permissionKeys: this.getPermissionKeys(),
    };
  }
}
