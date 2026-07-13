import type { PolicyType, PolicyAction, RuleType, PolicyAssignmentTargetType } from '@veyonix/shared-types';

export interface RuleEntity {
  id: string;
  ruleGroupId: string;
  type: RuleType;
  action: PolicyAction;
  target: any;
  priority: number;
}

export interface RuleGroupEntity {
  id: string;
  policyVersionId: string;
  name: string;
  operator: string;
  rules: RuleEntity[];
  priority: number;
}

export interface PolicyVersionEntity {
  id: string;
  policyId: string;
  version: number;
  changeNotes: string | null;
  isActive: boolean;
  ruleGroups: RuleGroupEntity[];
  createdAt: Date;
}

export interface PolicyEntity {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  type: PolicyType;
  currentVersion: number;
  isActive: boolean;
  createdAt: Date;
}

export interface PoliciesRepository {
  findById(id: string): Promise<PolicyEntity | null>;
  findActiveVersion(policyId: string): Promise<PolicyVersionEntity | null>;
  createPolicy(policy: {
    id: string;
    organizationId: string;
    name: string;
    description?: string;
    type: PolicyType;
    createdBy: string;
  }): Promise<PolicyEntity>;
  createPolicyVersion(version: {
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
  }): Promise<PolicyVersionEntity>;
  
  assignPolicy(assignment: {
    id: string;
    policyId: string;
    targetId: string;
    targetType: PolicyAssignmentTargetType;
    assignedBy: string;
  }): Promise<void>;
  
  listPolicies(orgId: string): Promise<PolicyEntity[]>;
  listDevicePolicies(deviceId: string): Promise<PolicyEntity[]>;
}
