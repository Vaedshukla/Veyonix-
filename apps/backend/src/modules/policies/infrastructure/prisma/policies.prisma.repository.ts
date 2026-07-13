import type { PrismaClient } from '@prisma/client';
import type { PoliciesRepository, PolicyEntity, PolicyVersionEntity } from '../../domain/repositories/policies.repository';
import type { PolicyType, PolicyAction, RuleType, PolicyAssignmentTargetType } from '@veyonix/shared-types';

export class PrismaPoliciesRepository implements PoliciesRepository {
  private readonly prisma: PrismaClient;

  constructor(dependencies: { prisma: PrismaClient }) {
    this.prisma = dependencies.prisma;
  }

  async findById(id: string): Promise<PolicyEntity | null> {
    const policy = await this.prisma.policy.findUnique({
      where: { id },
    });
    if (!policy) return null;
    return this.mapToEntity(policy);
  }

  async findActiveVersion(policyId: string): Promise<PolicyVersionEntity | null> {
    const version = await this.prisma.policyVersion.findFirst({
      where: { policyId, isActive: true },
      include: {
        ruleGroups: {
          include: {
            rules: true,
          },
        },
      },
    });
    if (!version) return null;
    return {
      id: version.id,
      policyId: version.policyId,
      version: version.version,
      changeNotes: version.changeNotes,
      isActive: version.isActive,
      ruleGroups: version.ruleGroups.map((rg) => ({
        id: rg.id,
        policyVersionId: rg.policyVersionId,
        name: rg.name,
        operator: rg.operator,
        priority: rg.priority,
        rules: rg.rules.map((r) => ({
          id: r.id,
          ruleGroupId: r.ruleGroupId,
          type: r.type as RuleType,
          action: r.action as PolicyAction,
          target: r.target,
          priority: r.priority,
        })),
      })),
      createdAt: version.createdAt,
    };
  }

  async createPolicy(policy: {
    id: string;
    organizationId: string;
    name: string;
    description?: string;
    type: PolicyType;
    createdBy: string;
  }): Promise<PolicyEntity> {
    const created = await this.prisma.policy.create({
      data: {
        id: policy.id,
        organizationId: policy.organizationId,
        name: policy.name,
        description: policy.description ?? null,
        type: policy.type,
        isActive: true,
        currentVersion: 0,
        createdBy: policy.createdBy,
      },
    });
    return this.mapToEntity(created);
  }

  async createPolicyVersion(version: {
    id: string;
    policyId: string;
    version: number;
    changeNotes?: string;
    createdBy: string;
    ruleGroups: Array<{
      id: string;
      name: string;
      operator: string;
      rules: Array<{
        id: string;
        type: RuleType;
        action: PolicyAction;
        target: any;
        priority?: number;
      }>;
    }>;
  }): Promise<PolicyVersionEntity> {
    const created = await this.prisma.$transaction(async (tx) => {
      // 1. Deactivate old versions
      await tx.policyVersion.updateMany({
        where: { policyId: version.policyId, isActive: true },
        data: { isActive: false },
      });

      // 2. Create version
      const v = await tx.policyVersion.create({
        data: {
          id: version.id,
          policyId: version.policyId,
          version: version.version,
          changeNotes: version.changeNotes ?? null,
          isActive: true,
          createdBy: version.createdBy,
          ruleGroups: {
            create: version.ruleGroups.map((rg, rgIdx) => ({
              id: rg.id,
              name: rg.name,
              operator: rg.operator,
              priority: rgIdx,
              rules: {
                create: rg.rules.map((r, rIdx) => ({
                  id: r.id,
                  type: r.type,
                  action: r.action,
                  target: r.target,
                  priority: r.priority ?? rIdx,
                })),
              },
            })),
          },
        },
        include: {
          ruleGroups: {
            include: {
              rules: true,
            },
          },
        },
      });

      // 3. Update parent policy current version
      await tx.policy.update({
        where: { id: version.policyId },
        data: { currentVersion: version.version },
      });

      return v;
    });

    return {
      id: created.id,
      policyId: created.policyId,
      version: created.version,
      changeNotes: created.changeNotes,
      isActive: created.isActive,
      ruleGroups: created.ruleGroups.map((rg) => ({
        id: rg.id,
        policyVersionId: rg.policyVersionId,
        name: rg.name,
        operator: rg.operator,
        priority: rg.priority,
        rules: rg.rules.map((r) => ({
          id: r.id,
          ruleGroupId: r.ruleGroupId,
          type: r.type as RuleType,
          action: r.action as PolicyAction,
          target: r.target,
          priority: r.priority,
        })),
      })),
      createdAt: created.createdAt,
    };
  }

  async assignPolicy(assignment: {
    id: string;
    policyId: string;
    targetId: string;
    targetType: PolicyAssignmentTargetType;
    assignedBy: string;
  }): Promise<void> {
    await this.prisma.policyAssignment.create({
      data: {
        id: assignment.id,
        policyId: assignment.policyId,
        targetId: assignment.targetId,
        targetType: assignment.targetType,
        assignedBy: assignment.assignedBy,
      },
    });
  }

  async listPolicies(orgId: string): Promise<PolicyEntity[]> {
    const policies = await this.prisma.policy.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
    return policies.map((p) => this.mapToEntity(p));
  }

  async listDevicePolicies(deviceId: string): Promise<PolicyEntity[]> {
    // Queries policies direct-assigned to device, or target-assigned to user/classroom/school/org
    const assignments = await this.prisma.policyAssignment.findMany({
      where: {
        OR: [
          { targetId: deviceId, targetType: 'DEVICE' },
        ],
      },
      include: {
        policy: true,
      },
    });
    return assignments.map((a) => this.mapToEntity(a.policy));
  }

  private mapToEntity(p: any): PolicyEntity {
    return {
      id: p.id,
      organizationId: p.organizationId,
      name: p.name,
      description: p.description,
      type: p.type,
      currentVersion: p.currentVersion,
      isActive: p.isActive,
      createdAt: p.createdAt,
    };
  }
}
