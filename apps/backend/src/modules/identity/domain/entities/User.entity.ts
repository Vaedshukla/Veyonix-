import { uuidv7 } from 'uuidv7';

export interface UserProps {
  id: string;
  email: string;
  normalizedEmail: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isEmailVerified: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

export class UserEntity {
  private readonly props: UserProps;

  private constructor(props: UserProps) {
    this.props = { ...props };
  }

  static create(
    data: Omit<
      UserProps,
      | 'id'
      | 'failedLoginAttempts'
      | 'lockedUntil'
      | 'lastLoginAt'
      | 'version'
      | 'createdAt'
      | 'updatedAt'
      | 'deletedAt'
    >,
  ): UserEntity {
    return new UserEntity({
      ...data,
      id: uuidv7(),
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  }

  static reconstitute(props: UserProps): UserEntity {
    return new UserEntity(props);
  }

  get id(): string { return this.props.id; }
  get email(): string { return this.props.email; }
  get normalizedEmail(): string { return this.props.normalizedEmail; }
  get passwordHash(): string { return this.props.passwordHash; }
  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}`; }
  get isActive(): boolean { return this.props.isActive; }
  get isEmailVerified(): boolean { return this.props.isEmailVerified; }
  get failedLoginAttempts(): number { return this.props.failedLoginAttempts; }
  get lockedUntil(): Date | null { return this.props.lockedUntil; }
  get lastLoginAt(): Date | null { return this.props.lastLoginAt; }
  get version(): number { return this.props.version; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get deletedAt(): Date | null { return this.props.deletedAt; }

  isLocked(): boolean {
    if (!this.props.lockedUntil) return false;
    return this.props.lockedUntil > new Date();
  }

  recordFailedLogin(): void {
    this.props.failedLoginAttempts += 1;
    if (this.props.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
      this.props.lockedUntil = lockUntil;
    }
    this.props.updatedAt = new Date();
    this.props.version += 1;
  }

  recordSuccessfulLogin(): void {
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = null;
    this.props.lastLoginAt = new Date();
    this.props.updatedAt = new Date();
    this.props.version += 1;
  }

  verifyEmail(): void {
    this.props.isEmailVerified = true;
    this.props.updatedAt = new Date();
    this.props.version += 1;
  }

  changePassword(newHash: string): void {
    this.props.passwordHash = newHash;
    this.props.updatedAt = new Date();
    this.props.version += 1;
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.props.version += 1;
  }

  softDelete(): void {
    this.props.deletedAt = new Date();
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.props.version += 1;
  }

  toPlainObject(): UserProps {
    return { ...this.props };
  }
}
