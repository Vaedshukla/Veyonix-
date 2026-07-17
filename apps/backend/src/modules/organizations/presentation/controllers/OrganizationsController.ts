import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  InviteUserSchema,
  AssignRoleSchema,
  ListMembersSchema,
} from '../../application/dtos/organization.dto';
import type { CreateOrganizationUseCase } from '../../application/use-cases/CreateOrganization.usecase';
import type { UpdateOrganizationUseCase } from '../../application/use-cases/UpdateOrganization.usecase';
import type { InviteUserUseCase } from '../../application/use-cases/InviteUser.usecase';
import type { AssignRoleUseCase } from '../../application/use-cases/AssignRole.usecase';
import type { ListOrganizationMembersUseCase } from '../../application/use-cases/ListOrganizationMembers.usecase';

export interface OrganizationsControllerDeps {
  createOrganizationUseCase: CreateOrganizationUseCase;
  updateOrganizationUseCase: UpdateOrganizationUseCase;
  inviteUserUseCase: InviteUserUseCase;
  assignRoleUseCase: AssignRoleUseCase;
  listOrganizationMembersUseCase: ListOrganizationMembersUseCase;
}

/**
 * Thin Fastify controller for the Organizations module.
 *
 * Responsibilities:
 * 1. Parse and validate the incoming HTTP request via Zod schemas.
 * 2. Extract auth context from request.user (set by the auth middleware).
 * 3. Delegate to the appropriate use case.
 * 4. Shape and send the HTTP response.
 *
 * No business logic lives here — only HTTP concerns.
 */
export class OrganizationsController {
  constructor(private readonly deps: OrganizationsControllerDeps) {}

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.user) {
      return reply
        .status(401)
        .send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
    }

    const dto = CreateOrganizationSchema.parse(request.body);
    const { result } = await this.deps.createOrganizationUseCase.execute(dto, {
      actorId: request.user.id,
      correlationId: (request.headers['x-correlation-id'] as string) ?? null,
      ipAddress: request.ip,
    });
    reply.status(201).send({ success: true, data: result });
  }

  async update(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.user) {
      return reply
        .status(401)
        .send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
    }

    const dto = UpdateOrganizationSchema.parse(request.body);
    const result = await this.deps.updateOrganizationUseCase.execute(request.params.id, dto, {
      actorId: request.user.id,
      tenantId: undefined,
      correlationId: (request.headers['x-correlation-id'] as string) ?? null,
      ipAddress: request.ip,
    });
    reply.status(200).send({ success: true, data: result });
  }

  async inviteUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.user) {
      return reply
        .status(401)
        .send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
    }

    const dto = InviteUserSchema.parse(request.body);
    const { result } = await this.deps.inviteUserUseCase.execute(dto, {
      actorId: request.user.id,
      correlationId: (request.headers['x-correlation-id'] as string) ?? null,
      ipAddress: request.ip,
    });
    reply.status(201).send({ success: true, data: result });
  }

  async assignRole(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.user) {
      return reply
        .status(401)
        .send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
    }

    const dto = AssignRoleSchema.parse(request.body);
    await this.deps.assignRoleUseCase.execute(dto.membershipId, dto.roleId, {
      actorId: request.user.id,
      organizationId: request.params.id,
      correlationId: (request.headers['x-correlation-id'] as string) ?? null,
      ipAddress: request.ip,
    });
    reply.status(200).send({ success: true, data: null });
  }

  async listMembers(
    request: FastifyRequest<{ Params: { id: string }; Querystring: Record<string, string> }>,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.user) {
      return reply
        .status(401)
        .send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
    }

    const dto = ListMembersSchema.parse({ organizationId: request.params.id, ...request.query });
    const results = await this.deps.listOrganizationMembersUseCase.execute(dto);
    reply.status(200).send({ success: true, data: results });
  }

  async getDashboardStats(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.user) {
      return reply
        .status(401)
        .send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
    }

    const { id: orgId } = request.params;
    const prisma = (this.deps as any).prisma;

    // 1. Get total and active devices
    const devices = await prisma.device.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: {
        id: true,
        hostname: true,
        status: true,
        lastSeenAt: true,
      }
    });

    const totalDevices = devices.length;
    const activeDevices = devices.filter((d: any) => d.status === 'ACTIVE' || d.status === 'ONLINE').length;

    // 2. Query recent activities/logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 3. Block counters calculated dynamically
    const blockedActions = auditLogs.filter((log: any) => log.action === 'SESSION_REVOKED' || log.action === 'LOGIN_FAILED').length;
    const policyViolations = auditLogs.filter((log: any) => log.severity === 'CRITICAL' || log.severity === 'WARNING').length;

    reply.status(200).send({
      success: true,
      data: {
        stats: {
          activeAgents: activeDevices,
          policyViolations,
          blockedActions,
          totalMonitored: totalDevices,
        },
        devices: devices.map((d: any) => ({
          id: d.id,
          name: d.hostname,
          status: d.status.toLowerCase(),
          lastSeen: d.lastSeenAt ? d.lastSeenAt.toISOString() : null,
        })),
        recentActivity: auditLogs.map((log: any) => ({
          id: log.id,
          timestamp: log.createdAt.toISOString(),
          device: log.ipAddress || 'SYSTEM',
          action: log.action,
          category: log.severity === 'CRITICAL' ? 'blocked' : log.severity === 'WARNING' ? 'warned' : 'allowed',
          details: `${log.action} severity ${log.severity}: ${JSON.stringify(log.details || {})}`
        }))
      }
    });
  }
}
