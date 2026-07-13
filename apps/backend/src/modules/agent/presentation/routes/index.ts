import type { FastifyInstance } from 'fastify';

import { AgentController } from '../controllers/agent.controller';
import { authenticateAgentCrypto } from '@shared/guards/agent-crypto.guard';

export async function agentRoutes(app: FastifyInstance): Promise<void> {
  const controller = app.container.resolve<AgentController>('agentController');

  // ── Enroll Device (Public Agent Endpoint) ───────────────────────────
  app.post('/enroll', {
    schema: {
      tags: ['Agent'],
      summary: 'Enroll a new desktop agent',
      description: 'Registers device parameters, maps public key, and generates device certificates.',
      body: {
        type: 'object',
        required: ['macAddress', 'hostname', 'name', 'platform', 'organizationId', 'publicKey'],
        properties: {
          macAddress: { type: 'string' },
          hostname: { type: 'string' },
          name: { type: 'string' },
          platform: { type: 'string', enum: ['WINDOWS', 'MACOS', 'CHROMEOS', 'LINUX', 'IOS', 'ANDROID'] },
          osVersion: { type: 'string' },
          agentVersion: { type: 'string' },
          organizationId: { type: 'string', format: 'uuid' },
          publicKey: { type: 'string' },
        },
      },
    },
  }, controller.enroll.bind(controller));

  // ── Heartbeat & Telemetry (Protected Agent Endpoint) ────────────────
  app.post('/heartbeat', {
    preHandler: [authenticateAgentCrypto],
    schema: {
      tags: ['Agent'],
      summary: 'Send agent heartbeat telemetry',
      description: 'Uploads system stats and retrieves pending command queue.',
      security: [{ AgentAuth: [] }],
      body: {
        type: 'object',
        properties: {
          cpuPercent: { type: 'number' },
          memoryMb: { type: 'number' },
          diskFreeGb: { type: 'number' },
          activeProcesses: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, controller.heartbeat.bind(controller));
}
