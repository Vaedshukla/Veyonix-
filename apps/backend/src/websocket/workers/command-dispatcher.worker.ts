import { Worker } from 'bullmq';
import type Redis from 'ioredis';

import { ConnectionRegistry } from '../registry.interface';
import { registry as wsLocalRegistry, sendWsMessage, WsMessageType } from '../gateway';
import { env } from '@config/index';
import { redisUrl } from '@config/redis';

export interface AgentCommandJobData {
  deviceId: string;
  commandId: string;
  type: string;
  payload?: unknown;
}

export function startCommandDispatcherWorker(
  connectionRegistry: ConnectionRegistry,
  redisClient: Redis
): Worker {
  const worker = new Worker<AgentCommandJobData>(
    'agent',
    async (job) => {
      if (job.name !== 'agent-command') return;

      const { deviceId, commandId, type, payload } = job.data;
      const targetNode = await connectionRegistry.getAgentNode(deviceId);

      if (!targetNode) {
        // Device offline, let heartbeat polling fetch it later
        return;
      }

      const currentNodeAddress = `${env.APP_HOST}:${env.APP_PORT}`;

      if (targetNode === currentNodeAddress) {
        // Device is connected locally to this node
        const localAgent = wsLocalRegistry.getAgent(deviceId);
        if (localAgent) {
          sendWsMessage(localAgent.socket, WsMessageType.COMMAND, {
            commandId,
            type,
            payload,
          });
        }
      } else {
        // Node is remote, publish a Redis Pub/Sub message targeting the destination node
        const channel = `veyonix:node:${targetNode}`;
        await redisClient.publish(
          channel,
          JSON.stringify({
            deviceId,
            commandId,
            type,
            payload,
          })
        );
      }
    },
    {
      connection: { url: redisUrl },
    }
  );

  return worker;
}
