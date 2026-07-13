import { generateId } from '@shared/utils/id';
import { DeviceNotFoundError } from '../../domain/errors/DeviceErrors';
import { DomainEventType, publishEvent } from '@shared/events/event-bus';
import { registry, sendWsMessage, WsMessageType } from '@/websocket/gateway';
import { CommandStatus } from '@veyonix/shared-types';
import type { DevicesRepository, DeviceCommandEntity } from '../../domain/repositories/devices.repository';
import type { IssueCommandCommand } from './IssueCommand.command';

export class IssueCommandHandler {
  private readonly devicesRepository: DevicesRepository;

  constructor(dependencies: {
    devicesRepository: DevicesRepository;
  }) {
    this.devicesRepository = dependencies.devicesRepository;
  }

  async handle(command: IssueCommandCommand, issuedById: string): Promise<DeviceCommandEntity> {
    const device = await this.devicesRepository.findById(command.deviceId);
    if (!device) {
      throw new DeviceNotFoundError(command.deviceId);
    }

    const commandId = generateId();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // 1. Create command record
    const cmd = await this.devicesRepository.createCommand({
      id: commandId,
      deviceId: command.deviceId,
      issuedById,
      type: command.type,
      payload: command.payload ?? {},
      expiresAt,
    });

    // 2. Try sending immediately over WebSocket
    const connectedAgent = registry.getAgent(command.deviceId);
    if (connectedAgent) {
      sendWsMessage(connectedAgent.socket, WsMessageType.COMMAND, {
        commandId: cmd.id,
        type: cmd.type,
        payload: cmd.payload,
      });

      // Update command status to SENT in the DB
      await this.devicesRepository.updateCommandStatus(cmd.id, CommandStatus.SENT, new Date());
      cmd.status = CommandStatus.SENT;
      cmd.sentAt = new Date();
    }

    // 3. Publish Domain Event
    await publishEvent(DomainEventType.DEVICE_COMMAND_ISSUED, {
      aggregateId: cmd.id,
      organizationId: device.organizationId,
      payload: {
        deviceId: cmd.deviceId,
        type: cmd.type,
        issuedById,
      },
    });

    return cmd;
  }
}
