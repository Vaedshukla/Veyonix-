export interface PermissionProps {
  id: string;
  key: string; // e.g. 'users.read', 'devices.manage'
  description: string | null;
  createdAt: Date;
}

export class PermissionEntity {
  private readonly props: PermissionProps;

  private constructor(props: PermissionProps) {
    this.props = Object.freeze({ ...props });
  }

  static reconstitute(props: PermissionProps): PermissionEntity {
    return new PermissionEntity(props);
  }

  get id(): string { return this.props.id; }
  get key(): string { return this.props.key; }
  get description(): string | null { return this.props.description; }
  get createdAt(): Date { return this.props.createdAt; }

  /**
   * Returns true if this permission matches the requested key.
   * Supports wildcard suffix matching: 'devices.*' matches 'devices.read'.
   */
  matches(key: string): boolean {
    if (this.props.key === key) return true;
    if (this.props.key.endsWith('.*')) {
      const prefix = this.props.key.slice(0, -2);
      return key.startsWith(`${prefix}.`);
    }
    return false;
  }

  toPlainObject(): PermissionProps {
    return { ...this.props };
  }
}
