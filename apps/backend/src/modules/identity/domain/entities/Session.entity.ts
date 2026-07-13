import { uuidv7 } from 'uuidv7';

export interface SessionProps {
  id: string;
  userId: string;
  deviceName: string | null;
  deviceType: string | null;
  platform: string | null;
  browser: string | null;
  location: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  createdAt: Date;
  lastActiveAt: Date;
}

export class SessionEntity {
  private readonly props: SessionProps;

  private constructor(props: SessionProps) {
    this.props = { ...props };
  }

  static create(data: {
    userId: string;
    expiresAt: Date;
    deviceName?: string | null;
    deviceType?: string | null;
    platform?: string | null;
    browser?: string | null;
    location?: string | null;
    ipAddress?: string | null;
  }): SessionEntity {
    return new SessionEntity({
      id: uuidv7(),
      userId: data.userId,
      deviceName: data.deviceName ?? null,
      deviceType: data.deviceType ?? null,
      platform: data.platform ?? null,
      browser: data.browser ?? null,
      location: data.location ?? null,
      ipAddress: data.ipAddress ?? null,
      expiresAt: data.expiresAt,
      revokedAt: null,
      revokedReason: null,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    });
  }

  static reconstitute(props: SessionProps): SessionEntity {
    return new SessionEntity(props);
  }

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get deviceName(): string | null { return this.props.deviceName; }
  get deviceType(): string | null { return this.props.deviceType; }
  get platform(): string | null { return this.props.platform; }
  get browser(): string | null { return this.props.browser; }
  get location(): string | null { return this.props.location; }
  get ipAddress(): string | null { return this.props.ipAddress; }
  get expiresAt(): Date { return this.props.expiresAt; }
  get revokedAt(): Date | null { return this.props.revokedAt; }
  get revokedReason(): string | null { return this.props.revokedReason; }
  get createdAt(): Date { return this.props.createdAt; }
  get lastActiveAt(): Date { return this.props.lastActiveAt; }

  isExpired(): boolean {
    return this.props.expiresAt < new Date();
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  isValid(): boolean {
    return !this.isExpired() && !this.isRevoked();
  }

  revoke(reason: string = 'USER_LOGOUT'): void {
    this.props.revokedAt = new Date();
    this.props.revokedReason = reason;
  }

  touch(): void {
    this.props.lastActiveAt = new Date();
  }

  toPlainObject(): SessionProps {
    return { ...this.props };
  }
}
