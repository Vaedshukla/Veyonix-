import { TokenExpiredOrExhaustedError } from '../errors/DeviceDomainError';

export interface EnrollmentTokenProps {
  id: string;
  organizationId: string;
  tokenHash: string;
  expiresAt: Date;
  maxUses: number;
  uses: number;
  createdBy: string;
  createdAt: Date;
}

export class EnrollmentTokenEntity {
  private props: EnrollmentTokenProps;

  constructor(props: EnrollmentTokenProps) {
    this.props = { ...props };
  }

  get id() { return this.props.id; }
  get organizationId() { return this.props.organizationId; }
  get maxUses() { return this.props.maxUses; }
  get uses() { return this.props.uses; }

  isValid(): boolean {
    return new Date() < this.props.expiresAt && this.props.uses < this.props.maxUses;
  }

  consume(): void {
    if (!this.isValid()) {
      throw new TokenExpiredOrExhaustedError();
    }
    this.props.uses += 1;
  }

  toPlainObject(): EnrollmentTokenProps {
    return { ...this.props };
  }
}
