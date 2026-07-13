import { generateId } from '@shared/utils/id';
import { DeviceNotFoundError } from '../../../devices/domain/errors/DeviceErrors';
import { DomainEventType, publishEvent } from '@shared/events/event-bus';
import { DeviceStatus } from '@veyonix/shared-types';
import type { DevicesRepository, DeviceCommandEntity } from '../../../devices/domain/repositories/devices.repository';
import type { ProcessHeartbeatCommand } from './ProcessHeartbeat.command';

export interface HeartbeatResult {
  status: 'acknowledged';
  commands: DeviceCommandEntity[];
}

export class ProcessHeartbeatHandler {
  private readonly devicesRepository: DevicesRepository;

  constructor(dependencies: {
    devicesRepository: DevicesRepository;
  }) {
    this.devicesRepository = dependencies.devicesRepository;
  }

  async handle(deviceId: string, command: ProcessHeartbeatCommand): Promise<HeartbeatResult> {
    const device = await this.devicesRepository.findById(deviceId);
    if (!device) {
      throw new DeviceNotFoundError(deviceId);
    }

    const wasOffline = device.status === DeviceStatus.OFFLINE;

    // 1. Save telemetry heartbeat
    const heartbeatId = generateId();
    await this.devicesRepository.saveHeartbeat({
      id: heartbeatId,
      deviceId,
      cpuPercent: command.cpuPercent,
      memoryMb: command.memoryMb,
      diskFreeGb: command.diskFreeGb,
      payload: command.payload ?? {},
    });

    // 2. Update device status
    await this.devicesRepository.update(deviceId, {
      status: DeviceStatus.ONLINE,
      lastSeenAt: new Date(),
    });

    // 3. Check for pending commands (polling fallback)
    const pendingCommands = await this.devicesRepository.listPendingCommands(deviceId);

    // 4. Dispatch events
    if (wasOffline) {
      await publishEvent(DomainEventType.DEVICE_ONLINE, {
        aggregateId: deviceId,
        organizationId: device.organizationId,
        payload: {
          lastSeenAt: new Date(),
        },
      });
    }

    return {
      status: 'acknowledged',
      commands: pendingCommands,
    };
  }
}
