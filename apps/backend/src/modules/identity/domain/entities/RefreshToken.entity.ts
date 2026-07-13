import { uuidv7 } from 'uuidv7';

export interface RefreshTokenProps {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  rotatedFromTokenId: string | null;
  rotationCounter: number;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

export class RefreshTokenEntity {
  private readonly props: RefreshTokenProps;

  private constructor(props: RefreshTokenProps) {
    this.props = { ...props };
  }

  static create(data: {
    userId: string;
    tokenHash: string;
    familyId?: string;
    rotatedFromTokenId?: string | null;
    rotationCounter?: number;
    expiresAt: Date;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): RefreshTokenEntity {
    return new RefreshTokenEntity({
      id: uuidv7(),
      userId: data.userId,
      tokenHash: data.tokenHash,
      familyId: data.familyId ?? uuidv7(),
      rotatedFromTokenId: data.rotatedFromTokenId ?? null,
      rotationCounter: data.rotationCounter ?? 0,
      expiresAt: data.expiresAt,
      usedAt: null,
      revokedAt: null,
      userAgent: data.userAgent ?? null,
      ipAddress: data.ipAddress ?? null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: RefreshTokenProps): RefreshTokenEntity {
    return new RefreshTokenEntity(props);
  }

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get tokenHash(): string { return this.props.tokenHash; }
  get familyId(): string { return this.props.familyId; }
  get rotatedFromTokenId(): string | null { return this.props.rotatedFromTokenId; }
  get rotationCounter(): number { return this.props.rotationCounter; }
  get expiresAt(): Date { return this.props.expiresAt; }
  get usedAt(): Date | null { return this.props.usedAt; }
  get revokedAt(): Date | null { return this.props.revokedAt; }
  get userAgent(): string | null { return this.props.userAgent; }
  get ipAddress(): string | null { return this.props.ipAddress; }
  get createdAt(): Date { return this.props.createdAt; }

  isExpired(): boolean {
    return this.props.expiresAt < new Date();
  }

  isUsed(): boolean {
    return this.props.usedAt !== null;
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  isValid(): boolean {
    return !this.isExpired() && !this.isUsed() && !this.isRevoked();
  }

  markUsed(): void {
    this.props.usedAt = new Date();
  }

  revoke(): void {
    this.props.revokedAt = new Date();
  }

  toPlainObject(): RefreshTokenProps {
    return { ...this.props };
  }
}
