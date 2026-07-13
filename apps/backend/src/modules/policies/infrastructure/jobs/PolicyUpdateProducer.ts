import { BullMQEventBus } from '@shared/events/bullmq-event-bus';

export class PolicyUpdateProducer {
  constructor(private readonly eventBus: BullMQEventBus) {}

  async requestCompilation(deviceId: string, reason: string): Promise<void> {
    await this.eventBus.publish('policy.compile' as any, {
      aggregateId: deviceId,
      payload: {
        deviceId,
        reason,
        timestamp: new Date().toISOString(),
      }
    });
  }
}
