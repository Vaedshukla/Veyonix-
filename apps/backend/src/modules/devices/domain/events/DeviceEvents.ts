import { uuidv7 } from 'uuidv7';

export interface BaseEvent {
  eventId: string;
  occurredAt: Date;
}

export class DeviceEnrolledEvent implements BaseEvent {
  public readonly eventId: string = uuidv7();
  public readonly occurredAt: Date = new Date();

  constructor(
    public readonly deviceId: string,
    public readonly organizationId: string
  ) {}
}

export class DeviceStatusChangedEvent implements BaseEvent {
  public readonly eventId: string = uuidv7();
  public readonly occurredAt: Date = new Date();

  constructor(
    public readonly deviceId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string
  ) {}
}

export class DeviceAssignedEvent implements BaseEvent {
  public readonly eventId: string = uuidv7();
  public readonly occurredAt: Date = new Date();

  constructor(
    public readonly deviceId: string,
    public readonly userId: string,
    public readonly assignedBy: string
  ) {}
}

export class DeviceUnassignedEvent implements BaseEvent {
  public readonly eventId: string = uuidv7();
  public readonly occurredAt: Date = new Date();

  constructor(
    public readonly deviceId: string,
    public readonly unassignedAt: Date
  ) {}
}
