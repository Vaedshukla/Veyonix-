export type DeviceStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'QUARANTINED' | 'REVOKED' | 'DECOMMISSIONED';
export type EnrollmentStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
export type EnrollmentMethod = 'MANUAL' | 'GPO' | 'INTUNE' | 'JAMF' | 'OTHER';

export interface DeviceProps {
  id: string;
  organizationId: string;
  hostname: string;
  serialNumber: string | null;
  os: string;
  architecture: string;
  status: DeviceStatus;
  publicKey: string | null;
  deviceSecretHash: string;
  agentVersion: string;
  enrollmentStatus: EnrollmentStatus;
  enrollmentMethod: EnrollmentMethod;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class DeviceEntity {
  private props: DeviceProps;

  constructor(props: DeviceProps) {
    this.props = { ...props };
  }

  get id() { return this.props.id; }
  get organizationId() { return this.props.organizationId; }
  get deviceSecretHash() { return this.props.deviceSecretHash; }
  get status() { return this.props.status; }
  get enrollmentStatus() { return this.props.enrollmentStatus; }
  
  updateHeartbeat(): void {
    this.props.lastSeenAt = new Date();
    this.props.updatedAt = new Date();
  }

  suspend(): void {
    this.props.status = 'SUSPENDED';
    this.props.updatedAt = new Date();
  }

  reactivate(): void {
    this.props.status = 'ACTIVE';
    this.props.updatedAt = new Date();
  }

  changeStatus(status: DeviceStatus): void {
    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  toPlainObject(): DeviceProps {
    return { ...this.props };
  }
}
