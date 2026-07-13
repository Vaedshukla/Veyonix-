import { IDeviceRepository } from '../../domain/repositories/IDeviceRepository';
import { IDeviceAssignmentRepository } from '../../domain/repositories/IDeviceAssignmentRepository';
import { DeviceAssignmentEntity } from '../../domain/entities/DeviceAssignment.entity';
import { AssignDeviceDTO } from '../dtos/device.dto';
import { DeviceNotFoundError } from '../../domain/errors/DeviceDomainError';
import { DeviceAssignedEvent } from '../../domain/events/DeviceEvents';
import { uuidv7 } from 'uuidv7';

export class AssignDeviceUseCase {
  constructor(
    private readonly deviceRepo: IDeviceRepository,
    private readonly assignmentRepo: IDeviceAssignmentRepository,
    private readonly eventBus: { emit: (event: any) => Promise<void> }
  ) {}

  async execute(dto: AssignDeviceDTO): Promise<void> {
    const device = await this.deviceRepo.findById(dto.deviceId);

    if (!device) {
      throw new DeviceNotFoundError(dto.deviceId);
    }

    const activeAssignment = await this.assignmentRepo.findActiveByDevice(dto.deviceId);

    if (activeAssignment) {
      activeAssignment.close();
      await this.assignmentRepo.update(activeAssignment);
    }

    const newAssignment = new DeviceAssignmentEntity({
      id: uuidv7(),
      deviceId: dto.deviceId,
      userId: dto.userId,
      assignedBy: dto.assignedBy,
      assignedAt: new Date(),
      removedAt: null,
    });

    await this.assignmentRepo.create(newAssignment);
    await this.eventBus.emit(new DeviceAssignedEvent(device.id, dto.userId, dto.assignedBy));
  }
}
