import { DeviceAssignmentEntity } from '../entities/DeviceAssignment.entity';

export interface IDeviceAssignmentRepository {
  findActiveByDevice(deviceId: string): Promise<DeviceAssignmentEntity | null>;
  findHistoryByDevice(deviceId: string): Promise<DeviceAssignmentEntity[]>;
  create(assignment: DeviceAssignmentEntity): Promise<void>;
  update(assignment: DeviceAssignmentEntity): Promise<void>;
}
