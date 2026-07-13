export interface DeviceAssignmentProps {
  id: string;
  deviceId: string;
  userId: string | null;
  assignedAt: Date;
  assignedBy: string;
  removedAt: Date | null;
}

export class DeviceAssignmentEntity {
  private props: DeviceAssignmentProps;

  constructor(props: DeviceAssignmentProps) {
    this.props = { ...props };
  }

  get id() { return this.props.id; }
  get deviceId() { return this.props.deviceId; }

  close(removedAt: Date = new Date()): void {
    this.props.removedAt = removedAt;
  }

  isActive(): boolean {
    return this.props.removedAt === null;
  }

  toPlainObject(): DeviceAssignmentProps {
    return { ...this.props };
  }
}
